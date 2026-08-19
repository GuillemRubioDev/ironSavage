export const loggerCtx = 'ReviewsPlugin';

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * A Payment in this state is the ground truth for "the order was correctly
 * paid" — checked directly rather than trusting the Order's current state,
 * since an Order can move on to other states (Shipped, Cancelled, etc.)
 * after payment without that payment having been reversed.
 */
export const PAID_PAYMENT_STATE = 'Settled';
