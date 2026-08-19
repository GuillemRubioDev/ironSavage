import { DEFAULT_LOYALTY_OPTIONS } from './constants';
import type { LoyaltyConfig, LoyaltyPluginOptions } from './types';

/**
 * Loyalty points are a store-configurable business rule (like a pricing/promotion
 * setting), not a secret — so this is plugged in via `LoyaltyPlugin.init({...})`
 * options at bootstrap, unlike Redsys' env-var-based config which holds
 * infrastructure secrets and per-deployment endpoints.
 */
let cached: LoyaltyConfig | undefined;

export function setLoyaltyConfig(options: LoyaltyPluginOptions): void {
    cached = {
        pointsPerEuro: options.pointsPerEuro ?? DEFAULT_LOYALTY_OPTIONS.pointsPerEuro,
        pointValueInCents: options.pointValueInCents ?? DEFAULT_LOYALTY_OPTIONS.pointValueInCents,
        minRedeemablePoints: options.minRedeemablePoints ?? DEFAULT_LOYALTY_OPTIONS.minRedeemablePoints,
        maxDiscountPerOrderCents: options.maxDiscountPerOrderCents ?? DEFAULT_LOYALTY_OPTIONS.maxDiscountPerOrderCents,
    };
}

export function getLoyaltyConfig(): LoyaltyConfig {
    if (!cached) {
        // Falls back to defaults so unit tests (and any code that runs before
        // the plugin's `configuration` hook fires) still get sane values.
        cached = { ...DEFAULT_LOYALTY_OPTIONS };
    }
    return cached;
}
