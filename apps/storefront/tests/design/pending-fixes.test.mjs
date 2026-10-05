// Detalles menores de las revisiones finales de las fases 2, 3A y 3B, cerrados en la fase 4A.
import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.join(import.meta.dirname, '..', '..');
const src = path.join(root, 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const exists = f => access(path.join(src, f)).then(() => true, () => false);
const json = async f => JSON.parse(await read(f));

test('portada: plural de puntos, número de objetivo oculto, etiqueta revalidable y textos de puntos con cuenta', async () => {
    for (const loc of ['es', 'en']) {
        assert.match((await json(`features/loyalty/messages/${loc}.json`)).Loyalty.teaser.stats.earn, /\{count, plural/);
        assert.match((await json(`site/home/messages/${loc}.json`)).Home.trust.points.text, loc === 'es' ? /cuenta/ : /account/);
    }
    const teaser = await read('features/loyalty/loyalty-teaser.tsx');
    assert.match(teaser, /t\('stats\.earn', \{count: config\.pointsPerEuro\}\)/);
    assert.match(teaser, /getLoyaltyProgramConfig\(\)\.catch\(\(\) => null\)/);
    assert.match(teaser, /text-3xl sm:text-4xl md:text-5xl/);
    assert.match(await read('components/brand/collection-tile.tsx'), /<span aria-hidden="true" className="font-mono/);
    assert.match(await read('platform/revalidation/handler.ts'), /\{match: 'loyalty-config', kind: 'exact'\}/);
    assert.match(await read('site/home/hero-banner.tsx'), /&& Boolean\(banner\.image\)/);
});

test('restos sin uso eliminados: parallax y embla-carousel-autoplay', async () => {
    assert.equal(await exists('components/parallax-layer.tsx'), false);
    assert.doesNotMatch(await read('app/[locale]/globals.css'), /parallax-layer/);
    assert.doesNotMatch(await readFile(path.join(root, 'package.json'), 'utf8'), /embla-carousel-autoplay/);
});

test('listados: "Ver X" cuenta visibles, título del selector con el producto, misma visibilidad que la ficha y filtros quitables con 0 resultados', async () => {
    assert.match(await read('features/search/facet-filters.tsx'), /t\('showResults', \{count: visibleTotal\}\)/);
    assert.match(await read('features/search/catalog-results.tsx'), /visibleTotalPromise=\{visibleTotal\(productDataPromise\)\}/);
    assert.match(await read('features/products/quick-add-data.ts'), /!product\.customFields\?\.visibleInStorefront/);
    assert.match(await read('features/products/components/quick-add-button.tsx'), /t\('quickAddTitle', \{name: product\.name\}\)/);
    for (const loc of ['es', 'en']) assert.match((await json(`features/products/messages/${loc}.json`)).Product.quickAddTitle, /\{name\}/);
    const grid = await read('features/products/product-grid.tsx');
    assert.match(grid, /export async function visibleTotal/);
    const empty = grid.slice(grid.indexOf('if (!visibleItems.length)'), grid.indexOf('if (!visibleItems.length)') + 600);
    assert.match(empty, /<ActiveFilters/);
});
