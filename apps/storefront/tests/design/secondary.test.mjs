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
