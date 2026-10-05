// Detalles menores de la revisión final de la fase 5A, cerrados en la 5B.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('barras fijas con la zona segura del iPhone y sin hueco doble en el carrito', async () => {
    assert.match(await read('app/[locale]/globals.css'), /padding-bottom: calc\(5rem \+ env\(safe-area-inset-bottom\)\)/);
    assert.doesNotMatch(await read('features/cart/routes/cart.tsx'), /pb-24/);
});

test('resumen: saludo sin coma colgando, moneda activa y puntos con plural', async () => {
    const page = await read('features/account/routes/summary/page.tsx');
    assert.match(page, /customer\?\.firstName \? t\('overview\.greeting'/);
    assert.match(page, /getActiveCurrencyCode\(\)/);
    for (const loc of ['es', 'en']) {
        const o = (await json(`features/account/messages/${loc}.json`)).Account.overview;
        assert.match(o.pointsBalance, /plural/);
        assert.match(o.toFirstRedeem, /plural/);
    }
});

test('con mínimo 0 y saldo 0 no se ofrece canjear 0 €', async () => {
    const {loyaltyProgress} = await load('features/account/account-summary.ts');
    assert.equal(loyaltyProgress({balance: 0, minRedeemablePoints: 0, pointValueInCents: 1, maxDiscountPerOrderCents: 2000}).canRedeem, false);
});

test('cerrar sesión se bloquea mientras trabaja', async () => {
    assert.match(await read('features/account/components/account-nav-links.tsx'), /useFormStatus/);
});
