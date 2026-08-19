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

export interface LoyaltyConfig {
    pointsPerEuro: number;
    pointValueInCents: number;
    minRedeemablePoints: number;
    maxDiscountPerOrderCents: number;
}
