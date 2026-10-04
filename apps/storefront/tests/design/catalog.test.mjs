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
