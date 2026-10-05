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

/**
 * Textos fijos con los que el servidor explica un canje rechazado (REASON_MESSAGES en
 * loyalty-shop.resolver.ts). Su errorCode es siempre LOYALTY_REDEMPTION_ERROR, así que
 * el motivo solo se puede sacar del texto.
 */
const SERVER_REASONS: Record<string, string> = {
    'The number of points requested is below the minimum redeemable amount': 'BELOW_MINIMUM',
    'No signed-in customer for this order': 'NO_CUSTOMER',
    'This order already has an active points redemption': 'ALREADY_REDEEMED',
    'This would exceed the maximum discount allowed per order': 'EXCEEDS_MAX_DISCOUNT',
    'This would exceed the order total': 'EXCEEDS_ORDER_TOTAL',
    'Not enough points in the account balance': 'INSUFFICIENT_BALANCE',
};

/** Clave de traducción del motivo de un canje rechazado; 'generic' si el texto es otro. */
export function redemptionErrorReason(message: string): string {
    return SERVER_REASONS[message] ?? 'generic';
}

/** Recargo con el que el servidor aplica un canje de puntos al pedido. */
export const LOYALTY_SURCHARGE_SKU = 'LOYALTY_POINTS_DISCOUNT';
