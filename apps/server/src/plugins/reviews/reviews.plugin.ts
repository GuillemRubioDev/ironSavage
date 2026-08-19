import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { ProductReview } from './product-review.entity';
import { ReviewsAdminResolver } from './reviews-admin.resolver';
import { ReviewsShopResolver } from './reviews-shop.resolver';
import { ReviewsService } from './reviews.service';

/**
 * Product review plugin: authenticated customers can review a product once
 * they've bought it in a correctly-paid order, and only APPROVED reviews are
 * ever shown publicly. Entirely self-contained — no core Vendure behaviour
 * modified, and it doesn't touch the Redsys, Loyalty, or Invoicing plugins.
 *
 * "Purchased and paid" is re-verified against the database on every write
 * (see ReviewsService.assertPurchased) — the customer id comes from the
 * authenticated session, never trusted from the client, and neither is any
 * claim about which order/product was purchased.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [ReviewsService],
    entities: [ProductReview],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ReviewsShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [ReviewsAdminResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class ReviewsPlugin {}
