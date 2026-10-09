// Imágenes: AVIF/WebP con next/image, tamaños ajustados al hueco real y Open Graph en JPG.
import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

// Node no resuelve imports relativos sin extensión ('./og-image-path'); el
// compilador de Next sí. Se prueba también con `.ts`, como haría él.
registerHooks({
    resolve(specifier, context, nextResolve) {
        try {
            return nextResolve(specifier, context);
        } catch (error) {
            if (!specifier.startsWith('.')) throw error;
            return nextResolve(`${specifier}.ts`, context);
        }
    },
});

const root = path.join(import.meta.dirname, '..', '..');
const src = path.join(root, 'src');
const load = f => import(new URL(`../../src/${f}`, import.meta.url));

async function sourceFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, {withFileTypes: true})) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await sourceFiles(file));
        if (entry.isFile() && /\.tsx$/.test(entry.name)) files.push(file);
    }
    return files;
}

test('next/image sirve AVIF y WebP, sin anchos por encima de la preview de Vendure (2048)', async () => {
    const config = await readFile(path.join(root, 'next.config.ts'), 'utf8');
    assert.match(config, /formats: \['image\/avif', 'image\/webp'\]/);
    const sizes = [...config.matchAll(/(?:imageSizes|deviceSizes): \[([^\]]+)\]/g)].flatMap(m => m[1].split(',').map(Number));
    assert.ok(sizes.length > 0 && Math.max(...sizes) <= 2048);
});

test('ninguna imagen usa el original (source) ni presets de Vendure, y toda imagen fill declara sizes', async () => {
    const problems = [];
    for (const file of await sourceFiles(src)) {
        const content = await readFile(file, 'utf8');
        const name = path.relative(root, file);
        for (const match of content.matchAll(/<Image\b[^>]*?\/>/gs)) {
            const tag = match[0];
            if (/src=\{[^}]*\.source\b/.test(tag)) problems.push(`${name}: usa source`);
            if (/\?preset=/.test(tag)) problems.push(`${name}: usa ?preset=`);
            if (/\bfill\b/.test(tag) && !/\bsizes=/.test(tag)) problems.push(`${name}: fill sin sizes`);
        }
    }
    assert.deepEqual(problems, []);
});

test('la URL de Open Graph solo acepta previews de Vendure', async () => {
    const {ogImagePath} = await load('platform/vendure/og-image-path.ts');
    assert.equal(
        ogImagePath('https://api.example.com/assets/preview/be/noticia_creatina__preview.webp'),
        '/api/og-image?src=preview%2Fbe%2Fnoticia_creatina__preview.webp',
    );
    assert.equal(ogImagePath('https://api.example.com/assets/source/be/noticia.png'), null);
    assert.equal(ogImagePath('https://api.example.com/assets/preview/be/../../secret'), null);
    assert.equal(ogImagePath('https://evil.example.com/x.webp'), null);
    assert.equal(ogImagePath(null), null);
});

test('la imagen Open Graph es un JPG de 1200×630 con fondo blanco aunque la preview sea transparente', async () => {
    process.env.VENDURE_SHOP_API_URL = 'http://vendure.test:3000/shop-api';
    const transparent = await sharp({create: {width: 800, height: 800, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 0}}}).webp().toBuffer();
    const requested = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        requested.push(String(url));
        return new Response(transparent);
    };
    try {
        const {GET} = await load('platform/vendure/og-image.ts');

        const response = await GET(new Request('http://shop.test/api/og-image?src=preview/ab/bote__preview.webp'));
        assert.equal(response.headers.get('Content-Type'), 'image/jpeg');
        assert.deepEqual(requested, ['http://vendure.test:3000/assets/preview/ab/bote__preview.webp']);
        const image = sharp(Buffer.from(await response.arrayBuffer()));
        const meta = await image.metadata();
        assert.deepEqual([meta.format, meta.width, meta.height], ['jpeg', 1200, 630]);
        const {dominant} = await image.stats();
        assert.ok(dominant.r > 240 && dominant.g > 240 && dominant.b > 240, 'el fondo transparente sale blanco, no negro');

        const rejected = await GET(new Request('http://shop.test/api/og-image?src=http://169.254.169.254/latest'));
        assert.equal(rejected.status, 400);
        assert.equal(requested.length, 1, 'una ruta no válida no llega a pedirse');
    } finally {
        globalThis.fetch = originalFetch;
    }
});
