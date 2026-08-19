export const loggerCtx = 'LoyaltyPlugin';

export const LOYALTY_TRANSACTION_TYPES = ['EARN', 'SPEND', 'REFUND', 'ADJUSTMENT', 'EXPIRE'] as const;
export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPES)[number];

/** Sensible defaults, overridable via `LoyaltyPlugin.init({...})`. */
export const DEFAULT_LOYALTY_OPTIONS = {
    pointsPerEuro: 1,
    pointValueInCents: 1,
    minRedeemablePoints: 100,
    maxDiscountPerOrderCents: 2000,
} as const;
