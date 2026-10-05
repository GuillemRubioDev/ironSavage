// Fase 5A del rediseño: cuenta.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('barra lateral oscura con inicial, Resumen exacto, Atleta solo para atletas y cerrar sesión', async () => {
    const nav = await read('features/account/components/account-nav.tsx');
    assert.match(nav, /href: '\/mi-cuenta', labelKey: 'summary', icon: 'LayoutDashboard', exact: true/);
    assert.match(nav, /athleteProfile \?/);
    assert.match(nav, /getActiveCustomer\(\)/);
    const links = await read('features/account/components/account-nav-links.tsx');
    assert.match(links, /item\.exact \? pathname === item\.href : pathname\.startsWith\(item\.href\)/);
    assert.match(links, /bg-brand/);
    assert.match(links, /logoutAction/);
    assert.match(links, /initial/);
});

test('títulos de la cuenta al estilo nuevo y "Mi cuenta" en la cabecera', async () => {
    for (const f of ['features/account/routes/orders/page.tsx', 'features/account/routes/addresses/page.tsx', 'features/account/routes/profile/page.tsx', 'features/loyalty/routes/page.tsx', 'features/invoices/routes/page.tsx']) {
        assert.match(await read(f), /<h1 className="[^"]*text-5xl/, f);
    }
    assert.match(await read('site/navigation/navbar/navbar-user.tsx'), /href="\/mi-cuenta"/);
    assert.match(await read('site/navigation/navbar/mobile-account-links.tsx'), /href="\/mi-cuenta"/);
    for (const loc of ['es', 'en']) {
        const a = (await json(`features/account/messages/${loc}.json`)).Account;
        assert.ok(a.summary && a.logout, `${loc}: faltan Account.summary/logout`);
    }
});

test('estados pagados y progreso de puntos', async () => {
    const {PAID_ORDER_STATES, loyaltyProgress} = await load('features/account/account-summary.ts');
    assert.ok(PAID_ORDER_STATES.includes('PaymentSettled') && PAID_ORDER_STATES.includes('Delivered'));
    for (const s of ['AddingItems', 'ArrangingPayment', 'Cancelled']) assert.equal(PAID_ORDER_STATES.includes(s), false, s);
    const cfg = {minRedeemablePoints: 100, pointValueInCents: 1, maxDiscountPerOrderCents: 2000};
    assert.deepEqual(loyaltyProgress({...cfg, balance: 40}), {canRedeem: false, percent: 40, remaining: 60, redeemableCents: 0});
    assert.deepEqual(loyaltyProgress({...cfg, balance: 500}), {canRedeem: true, percent: 100, remaining: 0, redeemableCents: 500});
    assert.deepEqual(loyaltyProgress({...cfg, balance: 9000}), {canRedeem: true, percent: 100, remaining: 0, redeemableCents: 2000});
});

test('repetir último pedido: solo pagados, línea a línea con addToCart, omite agotados e informa', async () => {
    assert.match(await read('features/account/graphql.ts'), /query GetLastPaidOrder\(\$states: \[String!\]!\)/);
    const action = await read('features/account/repeat-last-order.ts');
    assert.match(action, /^'use server';/);
    assert.match(action, /PAID_ORDER_STATES/);
    assert.match(action, /stockLevel === 'OUT_OF_STOCK'/);
    assert.match(action, /await addToCart\(line\.productVariant\.id, line\.quantity\)/);
    const button = await read('features/account/components/repeat-last-order-button.tsx');
    assert.match(button, /router\.push\('\/carrito'\)/);
    assert.match(button, /result\.added === 0/);
    for (const loc of ['es', 'en']) {
        const r = (await json(`features/account/messages/${loc}.json`)).Account.repeat;
        for (const k of ['button', 'added', 'skipped', 'nothingAdded', 'noOrder', 'error']) assert.ok(r?.[k], `${loc}: falta repeat.${k}`);
    }
});
