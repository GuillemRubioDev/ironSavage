/**
 * Regla del canje de puntos en el carrito, sin dependencias (se prueba con node --test).
 * Refleja las comprobaciones del servidor (LoyaltyService.redeemPoints) para no ofrecer
 * un canje que se va a rechazar; quien decide sigue siendo el servidor.
 */
export function maxRedeemablePoints({balance, pointValueInCents, maxDiscountPerOrderCents, orderTotalWithTax}: {
    balance: number;
    pointValueInCents: number;
    maxDiscountPerOrderCents: number;
    orderTotalWithTax: number;
}): number {
    if (balance <= 0 || pointValueInCents <= 0) return 0;
    const byCap = Math.floor(maxDiscountPerOrderCents / pointValueInCents);
    // El descuento tiene que quedar por debajo del total (el servidor rechaza >=).
    const byTotal = Math.floor((orderTotalWithTax - 1) / pointValueInCents);
    return Math.max(0, Math.min(balance, byCap, byTotal));
}
