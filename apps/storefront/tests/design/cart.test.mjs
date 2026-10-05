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

test('el máximo canjeable respeta saldo, tope por pedido y total del pedido', async () => {
    const {maxRedeemablePoints} = await load('features/loyalty/redemption.ts');
    const base = {pointValueInCents: 1, maxDiscountPerOrderCents: 2000};
    assert.equal(maxRedeemablePoints({...base, balance: 500, orderTotalWithTax: 8139}), 500);
    assert.equal(maxRedeemablePoints({...base, balance: 5000, orderTotalWithTax: 8139}), 2000);
    assert.equal(maxRedeemablePoints({...base, balance: 5000, orderTotalWithTax: 1500}), 1499);
    assert.equal(maxRedeemablePoints({...base, balance: 0, orderTotalWithTax: 1500}), 0);
});

test('el canje usa las mutaciones del servidor, refresca el carrito y solo aparece con sesión', async () => {
    assert.match(await read('features/loyalty/graphql.ts'), /redeemLoyaltyPoints\(points: \$points\)/);
    assert.match(await read('features/loyalty/graphql.ts'), /cancelLoyaltyPointsRedemption/);
    const actions = await read('features/loyalty/redeem-actions.ts');
    assert.match(actions, /^'use server';/);
    assert.match(actions, /updateTag\('cart'\)/);
    assert.match(actions, /t\(`redeem\.errors\.\$\{code\}`\)/);
    const cart = await read('features/cart/routes/cart.tsx');
    assert.match(cart, /loyaltyAccount/);
    assert.match(cart, /redemptionSlot=\{/);
    assert.match(cart, /sku === 'LOYALTY_POINTS_DISCOUNT'/);
    const ui = await read('features/loyalty/points-redemption.tsx');
    assert.match(ui, /maxPoints < minPoints/);
    for (const loc of ['es', 'en']) {
        const r = (await json(`features/loyalty/messages/${loc}.json`)).Loyalty.redeem;
        for (const k of ['title', 'available', 'equals', 'apply', 'applied', 'remove', 'minimum']) assert.ok(r[k], `${loc}: falta redeem.${k}`);
        for (const c of ['BELOW_MINIMUM', 'ALREADY_REDEEMED', 'EXCEEDS_MAX_DISCOUNT', 'EXCEEDS_ORDER_TOTAL', 'INSUFFICIENT_BALANCE', 'NO_CUSTOMER', 'generic']) assert.ok(r.errors[c], `${loc}: falta redeem.errors.${c}`);
    }
});
