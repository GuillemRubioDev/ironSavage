// Fase 4A del rediseño: carrito, canje de puntos y panel lateral.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('resumen oscuro con recargos (canje de puntos) y barra fija en móvil', async () => {
    assert.match(await read('features/cart/graphql.ts'), /surcharges \{\s*id\s*sku\s*description\s*priceWithTax\s*\}/);
    const summary = await read('features/cart/routes/order-summary.tsx');
    assert.match(summary, /bg-brand/);
    assert.match(summary, /activeOrder\.surcharges/);
    assert.match(summary, /lg:hidden fixed inset-x-0 bottom-0/);
});

test('carrito vacío sin título duplicado y con enlace a seguir comprando', async () => {
    const items = await read('features/cart/routes/cart-items.tsx');
    assert.doesNotMatch(items, /<h1/);
    assert.match(items, /href="\/productos"/);
});
