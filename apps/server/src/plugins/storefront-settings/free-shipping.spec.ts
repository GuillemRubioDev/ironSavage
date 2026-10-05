import assert from 'node:assert/strict';
import test from 'node:test';

import { freeShippingThreshold } from './free-shipping';

const checker = (orderMinimum: number, peninsula = true) => ({
    code: 'spain-territories-checker',
    args: [
        { name: 'orderMinimum', value: String(orderMinimum) },
        { name: 'peninsula', value: String(peninsula) },
    ],
});
const calculator = (rate: number) => ({ code: 'default-shipping-calculator', args: [{ name: 'rate', value: String(rate) }] });

test('envío gratis: el menor mínimo de los métodos de 0 € con mínimo', () => {
    const methods = [
        { checker: checker(0), calculator: calculator(500) },
        { checker: checker(6000), calculator: calculator(0) },
        { checker: checker(5000), calculator: calculator(0) },
    ];
    assert.deepEqual(freeShippingThreshold(methods, false), { amount: 5000, includesTax: false });
});

test('envío gratis: sin método gratis con mínimo, null', () => {
    assert.equal(freeShippingThreshold([{ checker: checker(0), calculator: calculator(500) }], false), null);
    // Gratis sin mínimo: no hay barra que mostrar.
    assert.equal(freeShippingThreshold([{ checker: checker(0), calculator: calculator(0) }], false), null);
    // Con mínimo pero de pago.
    assert.equal(freeShippingThreshold([{ checker: checker(5000), calculator: calculator(300) }], false), null);
});

test('envío gratis: no cuenta un método que no cubre la península ni otra condición', () => {
    assert.equal(freeShippingThreshold([{ checker: checker(5000, false), calculator: calculator(0) }], true), null);
    const other = { code: 'default-shipping-eligibility-checker', args: [] };
    assert.equal(freeShippingThreshold([{ checker: other, calculator: calculator(0) }], true), null);
});
