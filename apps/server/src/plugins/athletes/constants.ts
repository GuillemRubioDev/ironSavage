export const loggerCtx = 'AthletesPlugin';

/** Code of the PromotionCondition attached to every athlete code's Promotion. */
export const ATHLETE_PROMOTION_CONDITION_CODE = 'athlete_code';

/** How the customer's discount is computed — maps 1:1 to a built-in Vendure PromotionAction. */
export const ATHLETE_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type AthleteDiscountType = (typeof ATHLETE_DISCOUNT_TYPES)[number];

/**
 * How the athlete's reward is computed:
 * - PERCENTAGE: a % of the order's reward base, converted to points at the
 *   loyalty program's own redemption value (`pointValueInCents`).
 * - FIXED_POINTS: a flat number of points per qualifying order.
 */
export const ATHLETE_REWARD_TYPES = ['PERCENTAGE', 'FIXED_POINTS'] as const;
export type AthleteRewardType = (typeof ATHLETE_REWARD_TYPES)[number];

export const ATHLETE_REWARD_STATUSES = ['ACTIVE', 'PARTIALLY_REVERTED', 'REVERTED'] as const;
export type AthleteRewardStatus = (typeof ATHLETE_REWARD_STATUSES)[number];

export const ATHLETE_REVERSAL_REASONS = ['ORDER_CANCELLED', 'REFUND', 'MANUAL'] as const;
export type AthleteReversalReason = (typeof ATHLETE_REVERSAL_REASONS)[number];

/** Upper-case letters, digits, '-' and '_' only — no spaces, so a code reads the same when typed or dictated. */
export const ATHLETE_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
