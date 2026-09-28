export const loggerCtx = 'LoyaltyPlugin';

// ATHLETE_REWARD / ATHLETE_REWARD_REVERSAL are written by the AthletesPlugin
// (points an athlete earns when someone else buys with their code, and their
// reversal on cancellation/refund). They live in this same ledger so an
// athlete spends them through the exact same redemption flow as any customer.
export const LOYALTY_TRANSACTION_TYPES = ['EARN', 'SPEND', 'REFUND', 'ADJUSTMENT', 'EXPIRE', 'ATHLETE_REWARD', 'ATHLETE_REWARD_REVERSAL'] as const;
export type LoyaltyTransactionType = (typeof LOYALTY_TRANSACTION_TYPES)[number];

/** Sensible defaults, overridable via `LoyaltyPlugin.init({...})`. */
export const DEFAULT_LOYALTY_OPTIONS = {
    pointsPerEuro: 1,
    pointValueInCents: 1,
    minRedeemablePoints: 100,
    maxDiscountPerOrderCents: 2000,
} as const;
