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
