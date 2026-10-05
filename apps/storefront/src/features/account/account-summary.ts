/**
 * Reglas del resumen de la cuenta, sin dependencias (se prueban con node --test).
 */

/** Estados de un pedido ya pagado (excluye carrito en curso, pago pendiente y cancelados). */
export const PAID_ORDER_STATES = [
    'PaymentAuthorized',
    'PaymentSettled',
    // Estados propios del almacén (apps/server order-tools/warehouse-order-process.ts):
    // todo pedido pagado pasa por ellos antes de enviarse.
    'InPreparation',
    'ReadyToShip',
    'PartiallyShipped',
    'Shipped',
    'PartiallyDelivered',
    'Delivered',
];

/**
 * Barra de Iron Rewards: progreso hacia el primer canje (mínimo canjeable) o, si ya se
 * llega, cuánto se puede descontar en el próximo pedido (con el tope por pedido).
 */
export function loyaltyProgress({balance, minRedeemablePoints, pointValueInCents, maxDiscountPerOrderCents}: {
    balance: number;
    minRedeemablePoints: number;
    pointValueInCents: number;
    maxDiscountPerOrderCents: number;
}): {canRedeem: boolean; percent: number; remaining: number; redeemableCents: number} {
    // Sin saldo no hay nada que canjear, aunque el mínimo sea 0.
    if (balance > 0 && (minRedeemablePoints <= 0 || balance >= minRedeemablePoints)) {
        return {canRedeem: true, percent: 100, remaining: 0, redeemableCents: Math.min(balance * pointValueInCents, maxDiscountPerOrderCents)};
    }
    if (minRedeemablePoints <= 0) return {canRedeem: false, percent: 0, remaining: 0, redeemableCents: 0};
    return {
        canRedeem: false,
        percent: Math.round((Math.max(0, balance) / minRedeemablePoints) * 100),
        remaining: minRedeemablePoints - Math.max(0, balance),
        redeemableCents: 0,
    };
}
