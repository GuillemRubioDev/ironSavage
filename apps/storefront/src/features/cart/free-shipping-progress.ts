export interface FreeShippingThreshold {
    /** Pedido mínimo, en céntimos. */
    amount: number;
    /** true: se compara con el subtotal con IVA; false: con el subtotal sin IVA. */
    includesTax: boolean;
}

export interface FreeShippingProgress {
    reached: boolean;
    /** Lo que falta, con IVA (la tienda enseña los precios con IVA), en céntimos. */
    remainingWithTax: number;
    /** 0–100. */
    percent: number;
}

/**
 * Cuánto falta para el envío gratis. El servidor compara el mínimo con el subtotal que
 * toque (con o sin IVA, según el canal); si es sin IVA, lo que falta se pasa a importe
 * con IVA con la proporción del propio carrito. Null si no hay envío gratis.
 */
export function freeShippingProgress(
    threshold: FreeShippingThreshold | null | undefined,
    order: {subTotal: number; subTotalWithTax: number},
): FreeShippingProgress | null {
    if (!threshold || threshold.amount <= 0) return null;
    const current = threshold.includesTax ? order.subTotalWithTax : order.subTotal;
    const remaining = Math.max(0, threshold.amount - current);
    const taxRatio = !threshold.includesTax && order.subTotal > 0 ? order.subTotalWithTax / order.subTotal : 1;
    return {
        reached: remaining === 0,
        remainingWithTax: Math.ceil(remaining * taxRatio),
        // Multiplicar antes de dividir: (2900 / 5000) * 100 da 57,999… y saldría 57 %.
        percent: Math.min(100, Math.floor((current * 100) / threshold.amount)),
    };
}
