import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { setLoyaltyConfig } from './loyalty-config';
import { LoyaltyAccount } from './loyalty-account.entity';
import { LoyaltyAdminResolver } from './loyalty-admin.resolver';
import { LoyaltyEventSubscriber } from './loyalty-event-subscriber';
import { LoyaltyShopResolver } from './loyalty-shop.resolver';
import { LoyaltyTransaction } from './loyalty-transaction.entity';
import { LoyaltyService } from './loyalty.service';
import type { LoyaltyPluginOptions } from './types';

/**
 * Loyalty points program: customers earn points on settled payments and can
 * redeem them as an order discount. Entirely self-contained — no core
 * Vendure behaviour is modified. The discount is applied via the native
 * `OrderService.addSurchargeToOrder` mechanism (a negative-price surcharge),
 * so Vendure's own Promotions/pricing engine is never duplicated.
 *
 * Rules enforced by this plugin (see LoyaltyService for details):
 * - Every balance change is recorded as a LoyaltyTransaction; the ledger is
 *   the audit source of truth, `LoyaltyAccount.balance` is a cache of it.
 * - Points are only earned once an order reaches PaymentSettled (a DB unique
 *   index makes this idempotent even under duplicate events).
 * - Redemption is always a deliberate customer action — never automatic.
 * - Balance can never go negative (enforced by an atomic conditional UPDATE).
 * - A refund reverts a proportional, capped share of the points earned on
 *   that order.
 *
 * ## Setup
 *
 * Register with optional config, e.g.:
 * ```ts
 * LoyaltyPlugin.init({ pointsPerEuro: 1, pointValueInCents: 1, minRedeemablePoints: 100, maxDiscountPerOrderCents: 2000 })
 * ```
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [LoyaltyService, LoyaltyEventSubscriber],
    entities: [LoyaltyAccount, LoyaltyTransaction],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [LoyaltyShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [LoyaltyAdminResolver],
    },
    compatibility: '^3.0.0',
})
export class LoyaltyPlugin {
    static options: LoyaltyPluginOptions = {};

    static init(options: LoyaltyPluginOptions): typeof LoyaltyPlugin {
        LoyaltyPlugin.options = options;
        setLoyaltyConfig(options);
        return LoyaltyPlugin;
    }
}
