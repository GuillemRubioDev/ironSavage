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

test('panel lateral: se abre tras añadir desde la tarjeta y la ficha, con pedido activo y "Combínalo con"', async () => {
    const drawer = await read('features/cart/cart-drawer.tsx');
    assert.match(drawer, /^'use client';/);
    assert.match(drawer, /export function useCartDrawer\b/);
    assert.match(drawer, /export function CartDrawerProvider\b/);
    assert.match(drawer, /side="right"/);
    assert.match(drawer, /href="\/carrito"/);
    assert.match(drawer, /href="\/checkout"/);
    const data = await read('features/cart/drawer-data.ts');
    assert.match(data, /^'use server';/);
    assert.match(data, /filterVisibleProducts/);
    assert.match(await read('site/locale-layout.tsx'), /<CartDrawerProvider>/);
    assert.match(await read('features/products/components/quick-add-button.tsx'), /openCartDrawer\(loaded\.slug\)/);
    assert.match(await read('features/products/components/product-info.tsx'), /openCartDrawer\(product\.slug\)/);
    for (const loc of ['es', 'en']) {
        const c = (await json(`features/cart/messages/${loc}.json`)).Cart;
        for (const k of ['drawerTitle', 'combineWith', 'viewCart', 'drawerError']) assert.ok(c[k], `${loc}: falta Cart.${k}`);
    }
});

// Arreglos de la revisión final de la fase 4A.
test('el motivo del rechazo del canje sale del texto del servidor (su errorCode es siempre el mismo)', async () => {
    const {redemptionErrorReason} = await load('features/loyalty/redemption.ts');
    assert.equal(redemptionErrorReason('This order already has an active points redemption'), 'ALREADY_REDEEMED');
    assert.equal(redemptionErrorReason('Not enough points in the account balance'), 'INSUFFICIENT_BALANCE');
    assert.equal(redemptionErrorReason('This would exceed the order total'), 'EXCEEDS_ORDER_TOTAL');
    assert.equal(redemptionErrorReason('algo raro'), 'generic');
    const actions = await read('features/loyalty/redeem-actions.ts');
    assert.match(actions, /redemptionErrorReason\(result\.message\)/);
    // También se refresca el carrito al fallar (otra pestaña pudo cambiarlo).
    assert.equal((actions.match(/updateTag\('cart'\)/g) ?? []).length >= 3, true);
});

test('el campo de puntos se escribe libremente y se valida al enviar', async () => {
    const ui = await read('features/loyalty/points-redemption.tsx');
    assert.match(ui, /useState\(String\(maxPoints\)\)/);
    assert.match(ui, /const valid = Number\.isInteger\(parsed\) && parsed >= minPoints && parsed <= maxPoints/);
    assert.match(ui, /disabled=\{pending \|\| !valid\}/);
});

test('el canje se explica igual en el carrito y en el checkout, con texto traducido', async () => {
    const checkoutGql = await read('features/checkout/graphql.ts');
    assert.match(checkoutGql, /surcharges \{\s*id\s*sku\s*description\s*priceWithTax\s*\}/);
    const checkoutSummary = await read('features/checkout/routes/order-summary.tsx');
    assert.match(checkoutSummary, /order\.surcharges/);
    assert.match(checkoutSummary, /t\('loyaltyDiscount'\)/);
    assert.match(await read('features/cart/routes/order-summary.tsx'), /t\('loyaltyDiscount'\)/);
    for (const loc of ['es', 'en']) {
        assert.ok((await json(`features/cart/messages/${loc}.json`)).Cart.loyaltyDiscount);
        assert.ok((await json(`features/checkout/messages/${loc}.json`)).Checkout.loyaltyDiscount);
    }
});
