// Añadidos antes de subir el rediseño: envío gratis, muestras de color, puntos de los
// atletas y errores del servidor traducidos.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('progreso del envío gratis: lo que falta (con IVA) y el porcentaje', async () => {
    const {freeShippingProgress} = await load('features/cart/free-shipping-progress.ts');
    assert.equal(typeof freeShippingProgress, 'function');
    // Umbral sin IVA (canal sin IVA en los precios): lo que falta se enseña con IVA.
    assert.deepEqual(
        freeShippingProgress({amount: 5000, includesTax: false}, {subTotal: 4000, subTotalWithTax: 4840}),
        {reached: false, remainingWithTax: 1210, percent: 80},
    );
    assert.deepEqual(
        freeShippingProgress({amount: 5000, includesTax: true}, {subTotal: 4132, subTotalWithTax: 5000}),
        {reached: true, remainingWithTax: 0, percent: 100},
    );
    assert.equal(freeShippingProgress({amount: 5000, includesTax: false}, {subTotal: 2900, subTotalWithTax: 3190}).percent, 58);
    // 2900 / 5000 = 58 % justo (dividir primero daba 57,999… → 57 %).
    assert.equal(freeShippingProgress({amount: 5000, includesTax: false}, {subTotal: 2900, subTotalWithTax: 3190}).percent, 58);
    assert.equal(freeShippingProgress(null, {subTotal: 1, subTotalWithTax: 1}), null);
});

test('barra de envío gratis en el resumen y en el panel lateral', async () => {
    const bar = await read('features/cart/free-shipping-bar.tsx');
    assert.match(bar, /role="progressbar"/);
    assert.match(bar, /aria-valuenow/);
    assert.match(await read('features/cart/routes/order-summary.tsx'), /<FreeShippingBar/);
    assert.match(await read('features/cart/cart-drawer.tsx'), /<FreeShippingBar/);
    assert.match(await read('features/cart/routes/cart.tsx'), /getFreeShippingThreshold/);
    assert.match(await read('features/cart/drawer-data.ts'), /getFreeShippingThreshold/);
    for (const loc of ['es', 'en']) {
        const cart = (await json(`features/cart/messages/${loc}.json`)).Cart;
        assert.ok(cart.freeShippingRemaining && cart.freeShippingReached, loc);
    }
});

test('muestra de color en los botones de opción', async () => {
    assert.match(await read('features/products/graphql.ts'), /customFields \{\s*swatchColor\s*\}/);
    assert.match(await read('features/products/components/product-info.tsx'), /<OptionSwatch/);
    assert.match(await read('features/products/components/quick-add-button.tsx'), /<OptionSwatch/);
    const {swatchColorOf} = await load('features/products/swatch-color.ts');
    assert.equal(swatchColorOf('#8B4513'), '#8B4513');
    assert.equal(swatchColorOf('red; background:url(x)'), null);
    assert.equal(swatchColorOf(null), null);
});

test('la ficha no promete puntos a los atletas', async () => {
    assert.match(await read('features/loyalty/earning-actions.ts'), /athlete\?\.enabled/);
    assert.match(await read('features/products/components/product-detail-client.tsx'), /earnsPoints \? pointsPerEuro : 0/);
});

test('errores del servidor traducidos por código', async () => {
    const {serverErrorKey} = await load('platform/vendure/server-errors.ts');
    assert.equal(typeof serverErrorKey, 'function');
    assert.equal(serverErrorKey('VERIFICATION_TOKEN_INVALID_ERROR'), 'verificationTokenInvalid');
    assert.equal(serverErrorKey('VERIFICATION_TOKEN_EXPIRED_ERROR'), 'verificationTokenExpired');
    assert.equal(serverErrorKey('SOMETHING_NEW'), 'generic');
    assert.equal(serverErrorKey(undefined), 'generic');
    for (const loc of ['es', 'en']) {
        const messages = (await json(`platform/i18n/messages/${loc}.json`)).ServerErrors;
        for (const key of ['generic', 'verificationTokenInvalid', 'verificationTokenExpired', 'passwordResetTokenInvalid',
            'passwordResetTokenExpired', 'passwordValidation', 'emailAddressConflict', 'insufficientStock', 'orderLimit']) {
            assert.ok(messages[key], `${loc}: ${key}`);
        }
    }
    // Ningún sitio enseña el mensaje en inglés del servidor tal cual.
    for (const f of ['features/account/routes/profile/actions.ts', 'features/authentication/routes/verify/actions.ts',
        'features/authentication/routes/reset-password/actions.ts', 'features/authentication/routes/register/actions.ts',
        'features/authentication/routes/forgot-password/actions.ts', 'features/cart/routes/actions.ts',
        'features/checkout/routes/actions.ts', 'features/products/add-to-cart.ts', 'features/account/routes/verify-email/page.tsx']) {
        assert.doesNotMatch(await read(f), /(error|message|description):\s*[\w.?]+\.message\b(?!\s*\?\?)/, f);
    }
    assert.doesNotMatch(await read('features/account/routes/addresses/addresses-client.tsx'), /alert\('Error/);
    assert.doesNotMatch(await read('features/authentication/routes/sign-in/login-form.tsx'), /'Please |'Password is required'/);
});
