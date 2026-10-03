import type { Order, Refund } from '@vendure/core';

import type { InvoiceLineData } from './types';

interface Part {
    productName: string;
    sku: string;
    quantity: number;
    /** Importe con IVA, en céntimos, positivo. */
    gross: number;
    taxRate: number;
}

/** Separa un importe con IVA en base + cuota (en céntimos). */
export function splitGross(gross: number, taxRate: number): { net: number; tax: number } {
    const net = Math.round(gross / (1 + taxRate / 100));
    return { net, tax: gross - net };
}

/** Reparte `amount` entre `weights` en proporción, en unidades enteras, sumando exactamente `amount`. */
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
 * Líneas de la factura rectificativa de un reembolso, con importes NEGATIVOS, para
 * que el IVA revertido en cada tipo coincida con lo reembolsado:
 * - cada línea del pedido reembolsada, a su precio unitario prorrateado (descuentos incluidos);
 * - el envío reembolsado, al tipo de IVA del envío;
 * - cualquier otra cosa del total reembolsado (un reembolso por importe libre,
 *   ajustes), repartida entre los tipos de IVA del pedido en proporción a lo cobrado.
 * Las líneas suman siempre exactamente el total del reembolso.
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
        // El reembolso devolvió menos que el valor completo de las líneas: se reducen en proporción.
        const scaled = allocate(refund.total, parts.map(p => p.gross));
        parts.forEach((p, i) => (p.gross = scaled[i]));
        itemised = refund.total;
    }

    const remainder = refund.total - itemised;
    if (remainder > 0) {
        // Ponderado por lo que cobró el pedido en cada tipo.
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
