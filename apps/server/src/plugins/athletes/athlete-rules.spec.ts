import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const {
    calculateRefundReversal,
    calculateRewardPoints,
    firstAthleteCode,
    normalizeAthleteCode,
    rewardStatusFor,
    validateAthleteCodeInput,
} = require('./athlete-rules');

const validTerms = { code: 'PEDRO10', discountType: 'PERCENTAGE', discountValue: 10, rewardType: 'PERCENTAGE', rewardValue: 5 };

test('codes are normalized case-insensitively, matching Vendure coupon semantics', () => {
    assert.equal(normalizeAthleteCode('  pedro10 '), 'PEDRO10');
    assert.equal(normalizeAthleteCode('Pedro10'), normalizeAthleteCode('PEDRO10'));
});

test('valid code terms pass validation', () => {
    assert.equal(validateAthleteCodeInput(validTerms), undefined);
    assert.equal(validateAthleteCodeInput({ ...validTerms, discountValue: 0 }), undefined, '0% discount is a valid referral-only code');
    assert.equal(validateAthleteCodeInput({ ...validTerms, discountType: 'FIXED_AMOUNT', discountValue: 500 }), undefined);
    assert.equal(validateAthleteCodeInput({ ...validTerms, rewardType: 'FIXED_POINTS', rewardValue: 300 }), undefined);
    assert.equal(validateAthleteCodeInput({ ...validTerms, rewardValue: 7.5 }), undefined);
});

test('invalid percentages, amounts and codes are rejected', () => {
    assert.ok(validateAthleteCodeInput({ ...validTerms, discountValue: 101 }));
    assert.ok(validateAthleteCodeInput({ ...validTerms, discountValue: -1 }));
    assert.ok(validateAthleteCodeInput({ ...validTerms, rewardValue: 150 }));
    assert.ok(validateAthleteCodeInput({ ...validTerms, rewardValue: Number.NaN }));
    assert.ok(validateAthleteCodeInput({ ...validTerms, rewardValue: 5.555 }), 'at most two decimals');
    assert.ok(validateAthleteCodeInput({ ...validTerms, discountType: 'FIXED_AMOUNT', discountValue: 5.5 }), 'fixed discount in whole cents');
    assert.ok(validateAthleteCodeInput({ ...validTerms, rewardType: 'FIXED_POINTS', rewardValue: 1.5 }));
    assert.ok(validateAthleteCodeInput({ ...validTerms, code: 'AB' }), 'too short');
    assert.ok(validateAthleteCodeInput({ ...validTerms, code: 'PEDRO 10' }), 'spaces');
    assert.ok(validateAthleteCodeInput({ ...validTerms, code: 'PEDRO,10' }), 'commas would break Order.couponCodes lookups');
    assert.ok(validateAthleteCodeInput({ ...validTerms, discountType: 'BOGUS' }));
});

test('a 5% reward on a 100 € base is worth 5 € in points (500 pts at 1 pt = 1 cent)', () => {
    assert.equal(calculateRewardPoints('PERCENTAGE', 5, 10000, 1), 500);
});

test('reward percentage and point value are independent inputs', () => {
    assert.equal(calculateRewardPoints('PERCENTAGE', 8, 10000, 1), 800);
    assert.equal(calculateRewardPoints('PERCENTAGE', 5, 10000, 2), 250, 'points worth 2 cents each halve the count');
    assert.equal(calculateRewardPoints('PERCENTAGE', 7, 10000, 1), 700, 'no float drift (10000 * 0.07)');
    assert.equal(calculateRewardPoints('PERCENTAGE', 2.5, 3333, 1), 83, 'rounded down like regular EARN');
    assert.equal(calculateRewardPoints('PERCENTAGE', 0, 10000, 1), 0);
    assert.equal(calculateRewardPoints('FIXED_POINTS', 300, 999999, 1), 300);
});

test('refund reversals are proportional and never exceed what is left', () => {
    assert.equal(calculateRefundReversal(500, 0, 5000, 10000), 250, '50% refunded');
    assert.equal(calculateRefundReversal(500, 250, 10000, 10000), 250, 'capped at the remaining 250');
    assert.equal(calculateRefundReversal(500, 500, 10000, 10000), 0);
    assert.equal(calculateRefundReversal(500, 0, 20000, 10000), 500, 'refund above total caps at 100%');
});

test('reward status follows how much was reverted', () => {
    assert.equal(rewardStatusFor(500, 0), 'ACTIVE');
    assert.equal(rewardStatusFor(500, 100), 'PARTIALLY_REVERTED');
    assert.equal(rewardStatusFor(500, 500), 'REVERTED');
});

test('only the first athlete code applied to an order counts', () => {
    assert.equal(firstAthleteCode(['SUMMER', 'ANA5', 'PEDRO10'], ['PEDRO10', 'ANA5']), 'ANA5');
    assert.equal(firstAthleteCode(['SUMMER'], ['PEDRO10']), undefined);
    assert.equal(firstAthleteCode(['pedro10'], ['PEDRO10']), 'PEDRO10');
});
