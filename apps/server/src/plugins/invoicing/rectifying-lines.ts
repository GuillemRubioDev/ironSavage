import type { Order, Refund } from '@vendure/core';

import type { InvoiceLineData } from './types';

interface Part {
    productName: string;
    sku: string;
    quantity: number;
    /** Amount including tax, minor units, positive. */
    gross: number;
    taxRate: number;
}

/** Splits an amount that includes tax into base + tax (minor units). */
export function splitGross(gross: number, taxRate: number): { net: number; tax: number } {
    const net = Math.round(gross / (1 + taxRate / 100));
    return { net, tax: gross - net };
}

/** Allocates `amount` over `weights` proportionally, in whole units, summing exactly to `amount`. */
function allocate(amount: number, weights: number[]): number[] {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) {
        return weights.map((_, i) => (i === 0 ? amount : 0));
    }
    const shares = weights.map(w => Math.floor((amount * w) / totalWeight));
    let rest = amount - shares.reduce((a, b) => a + b, 0);
    const byWeight = weights.map((w, i) => i).sort((a, b) => weights[b] - weights[a]);
    for (let k = 0; rest > 0; k = (k + 1) % byWeight.length, rest--) {
        shares[byWeight[k]]++;
    }
    return shares;
}

/**
 * Lines of the rectifying invoice for a refund, with NEGATIVE amounts, so the
 * VAT reversed per rate matches what was refunded:
 * - each refunded order line at its prorated unit price (discounts included),
 * - the refunded shipping at the shipping tax rate,
 * - anything else in the refund total (a manual "amount" refund, adjustments)
 *   spread over the order's tax rates in proportion to what was charged.
 * The lines always add up exactly to the refund's total.
 */
export function buildRectifyingLines(order: Order, refund: Refund): {
    lines: InvoiceLineData[];
    subtotal: number;
    tax: number;
    total: number;
} {
    const parts: Part[] = [];
    for (const refundLine of refund.lines ?? []) {
        const orderLine = order.lines.find(l => String(l.id) === String(refundLine.orderLineId));
        if (!orderLine || refundLine.quantity <= 0) continue;
        parts.push({
            productName: `Devolución: ${orderLine.productVariant?.name ?? 'producto'}`,
            sku: orderLine.productVariant?.sku ?? '',
            quantity: refundLine.quantity,
            gross: orderLine.proratedUnitPriceWithTax * refundLine.quantity,
            taxRate: orderLine.taxRate,
        });
    }
    if (refund.shipping > 0) {
        parts.push({
            productName: 'Devolución: gastos de envío',
            sku: 'SHIPPING',
            quantity: 1,
            gross: refund.shipping,
            taxRate: order.shippingLines[0]?.taxRate ?? 0,
        });
    }

    let itemised = parts.reduce((sum, p) => sum + p.gross, 0);
    if (itemised > refund.total) {
        // The refund returned less than the lines' full value: scale them down.
        const scaled = allocate(refund.total, parts.map(p => p.gross));
        parts.forEach((p, i) => (p.gross = scaled[i]));
        itemised = refund.total;
    }

    const remainder = refund.total - itemised;
    if (remainder > 0) {
        // Weighted by what the order charged at each rate.
        const byRate = new Map<number, number>();
        for (const line of order.lines) byRate.set(line.taxRate, (byRate.get(line.taxRate) ?? 0) + line.proratedLinePriceWithTax);
        for (const s of order.shippingLines) byRate.set(s.taxRate, (byRate.get(s.taxRate) ?? 0) + s.discountedPriceWithTax);
        const rates = [...byRate.keys()];
        const shares = allocate(remainder, rates.map(r => byRate.get(r)!));
        rates.forEach((rate, i) => {
            if (shares[i] > 0) {
                parts.push({ productName: `Reembolso (IVA ${rate}%)`, sku: 'REFUND', quantity: 1, gross: shares[i], taxRate: rate });
            }
        });
    }

    const lines: InvoiceLineData[] = parts.map(p => {
        const { net, tax } = splitGross(p.gross, p.taxRate);
        return {
            productName: p.productName,
            sku: p.sku,
            quantity: p.quantity,
            unitPrice: -Math.round(net / p.quantity),
            taxRate: p.taxRate,
            taxAmount: -tax,
            lineTotal: -p.gross,
        };
    });
    const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const tax = lines.reduce((sum, l) => sum + l.taxAmount, 0);
    return { lines, subtotal: total - tax, tax, total };
}
