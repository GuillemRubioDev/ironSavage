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
    assert.match(toc, /if \(!items\.length\) return null/);
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
