// Fase 3A del rediseño (tarjeta, selector rápido y listados).
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

const sabor = {id: 'g1', options: [{id: 'choc'}, {id: 'van'}]};
const tamano = {id: 'g2', options: [{id: '1kg'}, {id: '2kg'}]};
const unico = {id: 'g3', options: [{id: 'bote'}]};
const v = (id, ...opts) => ({id, options: opts.map(([groupId, oid]) => ({groupId, id: oid}))});
const variants = [v('a', ['g1', 'choc'], ['g2', '1kg']), v('b', ['g1', 'choc'], ['g2', '2kg']), v('c', ['g1', 'van'], ['g2', '1kg'])];

test('solo los grupos de una opción salen marcados al empezar', async () => {
    const {initialSelection} = await load('features/products/variant-selection.ts');
    assert.deepEqual(initialSelection([sabor, unico, tamano]), {g3: 'bote'});
});

test('la variante solo existe con todos los grupos elegidos', async () => {
    const {findVariant} = await load('features/products/variant-selection.ts');
    assert.equal(findVariant(variants, [sabor, tamano], {g1: 'choc'}), undefined);
    assert.equal(findVariant(variants, [sabor, tamano], {g1: 'choc', g2: '2kg'})?.id, 'b');
    assert.equal(findVariant(variants, [sabor, tamano], {g1: 'van', g2: '2kg'}), undefined);
});

test('producto sin grupos y con una sola variante: esa variante, sin elegir nada', async () => {
    const {findVariant} = await load('features/products/variant-selection.ts');
    assert.equal(findVariant([v('solo')], [], {})?.id, 'solo');
    assert.equal(findVariant([v('x'), v('y')], [], {}), undefined);
});

test('una opción sin variante posible con el resto de la selección sale no disponible', async () => {
    const {isOptionAvailable} = await load('features/products/variant-selection.ts');
    assert.equal(isOptionAvailable(variants, {g1: 'van'}, 'g2', '2kg'), false);
    assert.equal(isOptionAvailable(variants, {g1: 'van'}, 'g2', '1kg'), true);
    assert.equal(isOptionAvailable(variants, {}, 'g1', 'van'), true);
});

test('withFacets cambia los filtros y vuelve a la página 1 sin tocar el resto', async () => {
    const {withFacets} = await load('features/search/search-helpers.ts');
    const params = new URLSearchParams('q=iso&facets=1&facets=2&page=3&sort=price-asc');
    assert.equal(withFacets(params, ['2', '5']), 'q=iso&sort=price-asc&facets=2&facets=5');
    assert.equal(withFacets(params, []), 'q=iso&sort=price-asc');
});

test('el selector rápido carga el producto al pulsar y lo oculta si no está a la venta', async () => {
    const data = await read('features/products/quick-add-data.ts');
    assert.match(data, /'use cache'/);
    assert.match(data, /!product\.enabled \|\| product\.customFields\?\.visibleInStorefront === false/);
    assert.match(data, /getDisplayOptionGroups\(product\)/);
    assert.match(await read('features/products/quick-add.ts'), /^'use server';/);
});

test('Añadir mete directamente un producto de una sola variante y si no abre el selector', async () => {
    const button = await read('features/products/components/quick-add-button.tsx');
    assert.match(button, /loaded\.variants\.length === 1/);
    assert.match(button, /addToCart\(variant\.id, qty\)/);
    assert.match(button, /initialSelection\(loaded\.optionGroups\)/);
    assert.match(button, /side="bottom"/);
    assert.match(button, /<DialogContent/);
    assert.match(button, /disabled=\{!available\}/);
    assert.match(button, /t\('productUnavailable'\)/);
    assert.doesNotMatch(button, /localStorage|sessionStorage|searchParams/);
});

test('textos nuevos del selector rápido en es y en', async () => {
    for (const loc of ['es', 'en']) {
        const p = (await json(`features/products/messages/${loc}.json`)).Product;
        for (const k of ['quickAdd', 'quickAddLabel', 'quickAddTitle', 'quantity', 'decreaseQuantity', 'increaseQuantity', 'viewDetails', 'productUnavailable']) {
            assert.ok(p[k], `${loc}: falta Product.${k}`);
        }
    }
});

test('la tarjeta tiene imagen fuera del tabulador, nombre como enlace y Añadir fuera del enlace', async () => {
    const card = await read('features/products/components/product-card.tsx');
    assert.match(card, /<article/);
    assert.match(card, /tabIndex=\{-1\} aria-hidden="true"/);
    assert.match(card, /<QuickAddButton slug=\{product\.slug\}/);
    assert.match(card, /hover-lift/);
    // Sin foto: el nombre en grande, no "Sin imagen".
    assert.doesNotMatch(card, /t\('noImage'\)/);
    // El botón no puede ir dentro de un <Link> (interactivo dentro de interactivo).
    const links = card.split('<Link').slice(1).map(s => s.split('</Link>')[0]);
    assert.ok(links.every(l => !l.includes('QuickAddButton')));
});

test('los tres listados usan la franja oscura y la misma estructura de filtros y rejilla', async () => {
    for (const f of ['features/products/routes/list-page.tsx', 'features/collections/routes/page.tsx', 'features/search/routes/search-term.tsx']) {
        assert.match(await read(f), /<ListingHeader/, `${f} sin ListingHeader`);
    }
    for (const f of ['features/products/routes/list-page.tsx', 'features/collections/routes/page.tsx', 'features/search/routes/search-results.tsx']) {
        assert.match(await read(f), /<CatalogResults/, `${f} sin CatalogResults`);
    }
    assert.match(await read('features/products/routes/list-page.tsx'), /<ProductCount/);
});

test('etiquetas de filtros activos que se quitan y orden encima de la rejilla', async () => {
    const grid = await read('features/products/product-grid.tsx');
    assert.match(grid, /<ActiveFilters/);
    assert.match(grid, /<SortDropdown/);
    assert.match(grid, /grid-cols-2/);
    const chips = await read('features/search/active-filters.tsx');
    assert.match(chips, /withFacets\(/);
    assert.match(chips, /t\('removeFilter', \{name: value\.name\}\)/);
});

test('en móvil los filtros salen desde abajo, no se cierran al marcar y muestran "Ver X productos"', async () => {
    const filters = await read('features/search/facet-filters.tsx');
    assert.match(filters, /side="bottom"/);
    assert.match(filters, /t\('showResults', \{count: searchResult\.totalItems\}\)/);
    assert.doesNotMatch(filters, /setSheetOpen\(false\)/);
    assert.match(filters, /withFacets\(/);
    for (const loc of ['es', 'en']) {
        const m = await json(`features/search/messages/${loc}.json`);
        for (const k of ['showResults', 'removeFilter', 'activeFilters']) assert.ok(m.Filters[k], `${loc}: falta Filters.${k}`);
        assert.ok(m.Search.home, `${loc}: falta Search.home`);
    }
});
