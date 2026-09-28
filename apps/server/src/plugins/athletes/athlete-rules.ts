import {
    ATHLETE_CODE_PATTERN,
    ATHLETE_DISCOUNT_TYPES,
    ATHLETE_REWARD_TYPES,
    AthleteDiscountType,
    AthleteRewardStatus,
    AthleteRewardType,
} from './constants';

/**
 * Pure business rules for athlete codes and rewards — no DB, no Nest — so
 * they can be unit-tested directly and are shared by the service, the
 * PromotionCondition and the event handlers.
 */

/**
 * Vendure matches coupon codes case-insensitively (PromotionService.validateCouponCode
 * compares LOWER()), so athlete codes follow the same strategy: stored in one
 * canonical upper-case form, which makes "pedro10" and "PEDRO10" the same
 * logical code and lets a plain unique index reject duplicates.
 */
export function normalizeAthleteCode(code: string): string {
    return code.trim().toUpperCase();
}

export interface AthleteCodeTerms {
    discountType: AthleteDiscountType;
    discountValue: number;
    rewardType: AthleteRewardType;
    rewardValue: number;
}

/** Returns a human-readable reason if the code or its terms are invalid, or undefined when valid. */
export function validateAthleteCodeInput(input: { code: string } & AthleteCodeTerms): string | undefined {
    if (!ATHLETE_CODE_PATTERN.test(normalizeAthleteCode(input.code))) {
        return 'The code must be 3-32 characters long and contain only letters, digits, "-" or "_"';
    }
    if (!ATHLETE_DISCOUNT_TYPES.includes(input.discountType)) {
        return `Unknown discount type "${input.discountType}"`;
    }
    if (!ATHLETE_REWARD_TYPES.includes(input.rewardType)) {
        return `Unknown reward type "${input.rewardType}"`;
    }
    if (!Number.isFinite(input.discountValue) || input.discountValue < 0) {
        return 'The customer discount must be a number greater than or equal to 0';
    }
    if (input.discountType === 'PERCENTAGE' && input.discountValue > 100) {
        return 'A percentage discount cannot exceed 100%';
    }
    if (input.discountType === 'FIXED_AMOUNT' && !Number.isInteger(input.discountValue)) {
        return 'A fixed discount must be a whole number of cents';
    }
    if (!Number.isFinite(input.rewardValue) || input.rewardValue < 0) {
        return 'The athlete reward must be a number greater than or equal to 0';
    }
    if (input.rewardType === 'PERCENTAGE' && input.rewardValue > 100) {
        return 'A percentage reward cannot exceed 100%';
    }
    if (input.rewardType === 'FIXED_POINTS' && !Number.isInteger(input.rewardValue)) {
        return 'A fixed reward must be a whole number of points';
    }
    if (hasMoreThanTwoDecimals(input.discountValue) || hasMoreThanTwoDecimals(input.rewardValue)) {
        return 'Percentages allow at most two decimals';
    }
    return undefined;
}

function hasMoreThanTwoDecimals(value: number): boolean {
    return Math.abs(Math.round(value * 100) - value * 100) > 1e-9;
}

/**
 * Points an athlete earns for one order. PERCENTAGE rewards reuse the
 * loyalty program's own point value, so "5%" means the reward is worth 5% of
 * the base once redeemed — with the default 1 point = 1 cent, a 5% reward
 * on a 100 € base is 500 points (5 €). Rounded down, like regular EARN.
 */
export function calculateRewardPoints(
    rewardType: AthleteRewardType,
    rewardValue: number,
    baseAmountCents: number,
    pointValueInCents: number,
): number {
    if (rewardType === 'FIXED_POINTS') {
        return Math.max(0, Math.floor(rewardValue));
    }
    if (baseAmountCents <= 0 || pointValueInCents <= 0) {
        return 0;
    }
    // Integer arithmetic on hundredths of a percent avoids float drift
    // (e.g. 10000 * 0.07 = 700.0000000000001).
    const basisPoints = Math.round(rewardValue * 100);
    const rewardCents = Math.floor((baseAmountCents * basisPoints) / 10000);
    return Math.floor(rewardCents / pointValueInCents);
}

/**
 * Points to revert for a (partial) refund: proportional to the refunded
 * share of the order and capped at what hasn't been reverted yet — the same
 * proportional rule LoyaltyService.revertForRefund applies to regular EARN.
 */
export function calculateRefundReversal(
    rewardPoints: number,
    alreadyReverted: number,
    refundTotal: number,
    orderTotalWithTax: number,
): number {
    const remaining = rewardPoints - alreadyReverted;
    if (remaining <= 0) {
        return 0;
    }
    const proportion = orderTotalWithTax > 0 ? Math.min(1, Math.max(0, refundTotal / orderTotalWithTax)) : 1;
    return Math.min(remaining, Math.round(rewardPoints * proportion));
}

export function rewardStatusFor(points: number, reverted: number): AthleteRewardStatus {
    if (reverted <= 0) {
        return 'ACTIVE';
    }
    return reverted >= points ? 'REVERTED' : 'PARTIALLY_REVERTED';
}

/**
 * Among the coupon codes applied to an order (in the order they were
 * applied), returns the first one that is an athlete code. Only that one is
 * honoured — an order can credit at most one athlete, and the customer can't
 * stack several athlete discounts.
 */
export function firstAthleteCode(orderCouponCodes: string[], athleteCodes: Iterable<string>): string | undefined {
    const known = new Set([...athleteCodes].map(normalizeAthleteCode));
    return orderCouponCodes.map(normalizeAthleteCode).find(code => known.has(code));
}
