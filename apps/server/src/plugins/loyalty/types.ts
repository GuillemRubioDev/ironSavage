import type { Order, RequestContext } from '@vendure/core';

export interface LoyaltyPluginOptions {
    /** Points earned per whole euro spent (based on Order.totalWithTax). */
    pointsPerEuro?: number;
    /** Monetary value of a single point, in cents, when redeemed as a discount. */
    pointValueInCents?: number;
    /** Minimum number of points a customer must redeem at once. */
    minRedeemablePoints?: number;
    /** Maximum discount (in cents) that points can apply to a single order. */
    maxDiscountPerOrderCents?: number;
}

/**
 * Lets another plugin veto the standard "earn points on your own purchase"
 * rule for specific orders without LoyaltyPlugin knowing why — e.g. the
 * AthletesPlugin uses this so athletes don't earn regular customer points.
 * Registered at bootstrap via `LoyaltyService.registerEarnPolicy()`.
 */
export interface LoyaltyEarnPolicy {
    /** Short identifier, only used in log messages. */
    name: string;
    /** Return false to skip the regular EARN for this order. */
    canEarnForOrder(ctx: RequestContext, order: Order): Promise<boolean>;
}

export interface LoyaltyConfig {
    pointsPerEuro: number;
    pointValueInCents: number;
    minRedeemablePoints: number;
    maxDiscountPerOrderCents: number;
}
