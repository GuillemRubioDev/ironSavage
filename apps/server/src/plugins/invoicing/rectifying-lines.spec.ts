import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { buildRectifyingLines, splitGross } = require('./rectifying-lines');

// 2 × protein (10 % IVA, 22,00 € each incl. tax) + 1 × shaker (21 %, 12,10 €) + shipping 6,05 € (21 %)
const order = {
    lines: [
        { id: 1, taxRate: 10, proratedUnitPriceWithTax: 2200, proratedLinePriceWithTax: 4400, productVariant: { name: 'Proteína 1kg', sku: 'PROT' } },
        { id: 2, taxRate: 21, proratedUnitPriceWithTax: 1210, proratedLinePriceWithTax: 1210, productVariant: { name: 'Shaker', sku: 'SHK' } },
    ],
    shippingLines: [{ taxRate: 21, discountedPriceWithTax: 605 }],
};
const sum = (lines: Array<{ lineTotal: number }>) => lines.reduce((a, l) => a + l.lineTotal, 0);

test('splitGross separates base and tax without losing cents', () => {
    assert.deepEqual(splitGross(1210, 21), { net: 1000, tax: 210 });
    assert.deepEqual(splitGross(2200, 10), { net: 2000, tax: 200 });
    const { net, tax } = splitGross(999, 21);
    assert.equal(net + tax, 999);
});

test('refund of specific lines: one negative line per refunded product, at its own IVA rate', () => {
    const r = buildRectifyingLines(order, { total: 2200, shipping: 0, lines: [{ orderLineId: 1, quantity: 1 }] });
    assert.equal(r.lines.length, 1);
    assert.deepEqual(r.lines[0], { productName: 'Devolución: Proteína 1kg', sku: 'PROT', quantity: 1, unitPrice: -2000, taxRate: 10, taxAmount: -200, lineTotal: -2200 });
    assert.deepEqual({ subtotal: r.subtotal, tax: r.tax, total: r.total }, { subtotal: -2000, tax: -200, total: -2200 });
});

test('full refund including shipping mirrors the original invoice, rate by rate', () => {
    const r = buildRectifyingLines(order, {
        total: 6215,
        shipping: 605,
        lines: [{ orderLineId: 1, quantity: 2 }, { orderLineId: 2, quantity: 1 }],
    });
    assert.equal(r.total, -6215);
    assert.equal(sum(r.lines), -6215);
    const taxAt = (rate: number) => r.lines.filter((l: { taxRate: number }) => l.taxRate === rate).reduce((a: number, l: { taxAmount: number }) => a + l.taxAmount, 0);
    assert.equal(taxAt(10), -400);
    assert.equal(taxAt(21), -315); // 210 (shaker) + 105 (shipping)
    assert.ok(r.lines.some((l: { sku: string }) => l.sku === 'SHIPPING'));
});

test('an amount-only refund is spread over the order tax rates and adds up exactly', () => {
    const r = buildRectifyingLines(order, { total: 1000, shipping: 0, lines: [] });
    assert.equal(sum(r.lines), -1000);
    assert.deepEqual(r.lines.map((l: { taxRate: number }) => l.taxRate).sort(), [10, 21]);
    assert.ok(r.lines.every((l: { lineTotal: number }) => l.lineTotal < 0));
});

test('refunding less than the lines are worth scales them down to the refunded amount', () => {
    const r = buildRectifyingLines(order, { total: 3000, shipping: 0, lines: [{ orderLineId: 1, quantity: 2 }] });
    assert.equal(sum(r.lines), -3000);
    assert.equal(r.lines.length, 1);
});

test('lines plus an extra amount: the remainder becomes weighted "Reembolso" lines', () => {
    const r = buildRectifyingLines(order, { total: 2700, shipping: 0, lines: [{ orderLineId: 1, quantity: 1 }] });
    assert.equal(sum(r.lines), -2700);
    assert.ok(r.lines.some((l: { sku: string }) => l.sku === 'REFUND'));
});
