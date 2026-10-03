export const loggerCtx = 'ReviewsPlugin';

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * Un Payment en este estado es la prueba fiable de que «el pedido se pagó
 * correctamente». Se comprueba directamente en vez de fiarse del estado actual del
 * pedido, que puede pasar a otros estados (Shipped, Cancelled, etc.) después del
 * pago sin que el pago se haya revertido.
 */
export const PAID_PAYMENT_STATE = 'Settled';
