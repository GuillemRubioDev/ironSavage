// Fase 6 del rediseño: páginas secundarias y repaso final.
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));

test('noticias: destacada en un bloque oscuro solo en la primera página y con artículos', async () => {
    const page = await read('features/news/routes/page.tsx');
    assert.match(page, /const featured = currentPage === 1 \? articles\[0\] : undefined/);
    assert.match(page, /\{featured && \(/);
    assert.match(page, /bg-brand/);
    assert.match(page, /<ListingHeader/);
    assert.match(page, /rest\.length > 0 &&/);
    for (const loc of ['es', 'en']) assert.ok((await json(`features/news/messages/${loc}.json`)).News.readArticle);
});

test('artículo con lectura cómoda: cabecera oscura y columna de unos 68 caracteres', async () => {
    const article = await read('features/news/routes/[slug]/page.tsx');
    assert.match(article, /bg-brand/);
    assert.match(article, /max-w-\[68ch\]/);
    assert.match(article, /text-lg leading-8/);
});

test('legales: índice generado de los títulos, sin índice al imprimir y texto siempre visible', async () => {
    const toc = await read('site/legal/legal-toc.tsx');
    assert.match(toc, /^'use client';/);
    assert.match(toc, /querySelectorAll\('h2'\)/);
    assert.match(toc, /if \(!items\.length\) return <div ref=\{navRef\} \/>;/);
    const shell = await read('site/legal/legal-page.tsx');
    assert.match(shell, /<LegalToc/);
    assert.match(shell, /print:hidden/);
    assert.match(shell, /max-w-\[70ch\]/);
    assert.match(shell, /id="legal-content"/);
    assert.match(shell, /<h1 className="[^"]*text-5xl/);
    for (const loc of ['es', 'en']) assert.ok((await json(`site/legal/messages/${loc}.json`)).Legal.contents);
});

test('404 en bloque oscuro con el número enorme animado (quieto con reducir movimiento)', async () => {
    const nf = await read('site/not-found.tsx');
    assert.match(nf, /bg-brand/);
    assert.match(nf, /animate-glitch-in/);
    assert.match(nf, /text-\[clamp\(/);
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /@keyframes glitch-in/);
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /\.animate-glitch-in/);
    const es = (await json('site/messages/es.json')).NotFound;
    assert.equal(es.title, 'Te has salido de la ruta');
});

test('página de error con el estilo nuevo y el mismo comportamiento', async () => {
    const page = await read('site/errors/error-page.tsx');
    assert.match(page, /bg-brand/);
    assert.match(page, /useAutoRecovery/);
    assert.match(page, /router\.refresh\(\)/);
    assert.match(page, /<h1 className="[^"]*text-5xl/);
});

async function tsxFiles(dir) {
    const out = [];
    for (const e of await readdir(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...await tsxFiles(p));
        else if (e.name.endsWith('.tsx')) out.push(p);
    }
    return out;
}

test('repaso final: ningún h1 con el estilo antiguo ni esqueletos con texto en inglés fijo', async () => {
    const offenders = [];
    for (const file of await tsxFiles(src)) {
        const s = await readFile(file, 'utf8');
        if (/<h1 className="[^"]*text-[23]xl[^"]*font-bold/.test(s)) offenders.push(path.relative(src, file));
        if (file.endsWith('loading.tsx') && /<h1[^>]*>[A-Z][a-z]+( [A-Z][a-z]+)?<\/h1>/.test(s)) offenders.push(`${path.relative(src, file)} (texto fijo)`);
    }
    assert.deepEqual(offenders, []);
    assert.doesNotMatch(await read('features/search/facet-filters.tsx'), /text-display text-lg font-bold/);
});

// Arreglos de la revisión final de la fase 6 (la última: se cierran también los menores).
test('ningún esqueleto ni pantalla de carga con texto fijo en inglés (incluida la verificación)', async () => {
    const offenders = [];
    for (const file of await tsxFiles(src)) {
        const name = path.basename(file);
        if (!/loading\.tsx$|skeleton.*\.tsx$/.test(name) || name === 'skeleton.tsx') continue;
        const s = await readFile(file, 'utf8');
        const m = s.match(/>\s*[A-Z][A-Za-z]+(?:[ ,.'][A-Za-z.]+)*\s*</);
        if (m) offenders.push(`${path.relative(src, file)}: ${m[0].trim()}`);
    }
    assert.deepEqual(offenders, []);
    assert.match(await read('features/authentication/routes/verify/verify-loading.tsx'), /t\('verifying'\)/);
    for (const loc of ['es', 'en']) {
        const v = (await json(`features/authentication/messages/${loc}.json`)).Verify;
        assert.ok(v.verifying && v.verifyingMessage);
    }
});

test('índice legal también en móvil, enlaces directos a un apartado y sin depender de un id global', async () => {
    const toc = await read('site/legal/legal-toc.tsx');
    assert.match(toc, /closest\('\[data-legal-page\]'\)/);
    assert.match(toc, /location\.hash/);
    assert.match(toc, /scrollIntoView/);
    const shell = await read('site/legal/legal-page.tsx');
    assert.match(shell, /data-legal-page/);
    assert.match(shell, /<details className="[^"]*lg:hidden/);
});

test('noticias: destacada sin portada a ancho completo, encabezados ordenados y esqueletos con el diseño nuevo', async () => {
    const page = await read('features/news/routes/page.tsx');
    assert.match(page, /featured\.coverImage \? 'md:grid-cols-2' : ''/);
    assert.match(page, /headingLevel="h2"/);
    assert.match(await read('features/news/components/article-card.tsx'), /headingLevel = 'h3'/);
    assert.match(await read('features/news/routes/list-loading.tsx'), /bg-brand/);
    assert.match(await read('features/news/routes/loading.tsx'), /bg-brand/);
});

test('restos de estilo antiguo fuera: reseñas, puntos y restablecer contraseña', async () => {
    assert.doesNotMatch(await read('features/reviews/product-reviews-section.tsx'), /text-2xl font-bold/);
    for (const f of ['features/loyalty/routes/page.tsx', 'features/loyalty/routes/athlete/page.tsx']) {
        const s = await read(f);
        assert.doesNotMatch(s, /text-3xl font-bold|text-xl font-semibold/, f);
    }
    assert.match(await read('features/authentication/routes/reset-password/reset-password-form.tsx'), /<h1 className="text-3xl">/);
    const cfg = await readFile(path.join(src, '..', '..', 'server', 'src', 'vendure-config.ts'), 'utf8');
    const field = cfg.slice(cfg.indexOf("name: 'authPanelImage'"), cfg.indexOf("name: 'authPanelImage'") + 500);
    assert.match(field, /public: false/);
});
