// Fase 4B del rediseño: checkout y confirmación.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const src = path.join(import.meta.dirname, '..', '..', 'src');
const read = f => readFile(path.join(src, f), 'utf8').catch(() => '');
const json = async f => JSON.parse(await read(f));
const load = async f => import(new URL(`../../src/${f}`, import.meta.url)).catch(() => ({}));

test('resumen de cada paso completado, sin textos vacíos', async () => {
    const {stepSummary} = await load('features/checkout/step-summary.ts');
    assert.equal(stepSummary('shipping', {address: {streetLine1: 'Calle Mayor 1', city: 'Madrid', postalCode: '28001'}}), 'Calle Mayor 1, 28001 Madrid');
    assert.equal(stepSummary('shipping', {address: {streetLine1: 'Calle Mayor 1'}}), 'Calle Mayor 1');
    assert.equal(stepSummary('shipping', {address: null}), null);
    assert.equal(stepSummary('delivery', {shippingMethodName: 'Envío estándar'}), 'Envío estándar');
    assert.equal(stepSummary('payment', {}), null);
    assert.equal(stepSummary('contact', {email: 'a@b.es'}), 'a@b.es');
    assert.equal(stepSummary('review', {email: 'a@b.es'}), null);
});

test('los paneles completados muestran su resumen y "Cambiar"; la barra de pasos también en móvil', async () => {
    const flow = await read('features/checkout/routes/checkout-flow.tsx');
    assert.match(flow, /stepSummary\(/);
    assert.match(flow, /t\('change'\)/);
    assert.match(flow, /t\('stepOf', \{current: /);
    assert.doesNotMatch(flow, /className="mb-8 hidden sm:block"/);
});

test('el botón de pagar dice el importe y conserva las mismas condiciones', async () => {
    const review = await read('features/checkout/routes/steps/review-step.tsx');
    assert.match(review, /t\('payAmount', \{amount: /);
    assert.match(review, /disabled=\{loading \|\| !termsAccepted \|\| !order\.shippingAddress \|\| !order\.shippingLines\?\.length \|\| !selectedPaymentMethodCode\}/);
    for (const loc of ['es', 'en']) {
        const c = (await json(`features/checkout/messages/${loc}.json`)).Checkout;
        for (const k of ['change', 'payAmount', 'stepOf']) assert.ok(c[k], `${loc}: falta Checkout.${k}`);
        assert.equal(c.steps.review, loc === 'es' ? 'Confirmación' : 'Confirm');
    }
});

test('resumen del checkout en zona de marca, legible en oscuro, y título grande', async () => {
    const summary = await read('features/checkout/routes/order-summary.tsx');
    assert.match(summary, /bg-brand/);
    assert.doesNotMatch(summary, /text-muted-foreground/);
    assert.match(summary, /text-brand-muted/);
    assert.match(await read('features/checkout/routes/page.tsx'), /<h1 className="mb-8 text-5xl md:text-6xl">/);
});

test('confirmación: bloque oscuro, confeti solo con el pago confirmado, puntos y tres tarjetas', async () => {
    const page = await read('features/orders/routes/order-confirmation.tsx');
    assert.match(page, /bg-brand/);
    assert.match(page, /const celebrate = !paymentPending && order\.state !== 'Cancelled'/);
    assert.match(page, /\{celebrate && <Confetti \/>\}/);
    assert.match(page, /getLoyaltyProgramConfig\(\)\.catch\(\(\) => null\)/);
    assert.match(page, /Math\.floor\(\(order\.totalWithTax \/ 100\) \* loyalty\.pointsPerEuro\)/);
    for (const k of ['nextTitle', 'invoiceTitle', 'accountTitle']) assert.match(page, new RegExp(`t\\('${k}'\\)`));
    // Se conserva la confirmación de Redsys y el refresco mientras el pago está pendiente.
    assert.match(page, /ConfirmRedsysPaymentMutation/);
    assert.match(page, /httpEquiv="refresh"/);
    for (const loc of ['es', 'en']) {
        const o = (await json(`features/orders/messages/${loc}.json`)).OrderConfirmation;
        for (const k of ['nextTitle', 'nextText', 'invoiceTitle', 'invoiceText', 'accountTitle', 'accountText', 'pointsEarned', 'viewOrder']) assert.ok(o[k], `${loc}: falta ${k}`);
    }
});

test('check animado y confeti en CSS, anulados con reducir movimiento', async () => {
    const css = await read('app/[locale]/globals.css');
    assert.match(css, /@keyframes check-draw/);
    assert.match(css, /@keyframes confetti-fall/);
    const tail = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(tail, /\.confetti \{ display: none !important; \}/);
    assert.match(tail, /\.animate-check-draw/);
});

// Arreglos de la revisión final de la fase 4B.
test('a los atletas activos no se les prometen puntos (el servidor no se los da)', async () => {
    const page = await read('features/orders/routes/order-confirmation.tsx');
    assert.match(page, /getMyAthleteProfile\(\)\.catch\(\(\) => null\)/);
    assert.match(page, /athlete\?\.enabled/);
});

test('el botón de pagar puede partirse en dos líneas en móviles estrechos', async () => {
    assert.match(await read('features/checkout/routes/steps/review-step.tsx'), /h-auto min-h-12 whitespace-normal py-3 text-balance/);
});
