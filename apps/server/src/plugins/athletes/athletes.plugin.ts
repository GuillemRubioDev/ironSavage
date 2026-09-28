import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { LoyaltyPlugin } from '../loyalty/loyalty.plugin';
import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { AthleteEventSubscriber } from './athlete-event-subscriber';
import { athleteCodeCondition } from './athlete-promotion-condition';
import { AthleteReward } from './athlete-reward.entity';
import { AthleteRewardReversal } from './athlete-reward-reversal.entity';
import { AthleteRewardService } from './athlete-reward.service';
import { AthleteService } from './athlete.service';
import { AthleteEntityResolver, AthleteRewardEntityResolver, AthletesAdminResolver } from './athletes-admin.resolver';
import { AthletesShopResolver } from './athletes-shop.resolver';

export { athletePermission } from './athlete.permission';

/**
 * Athletes: customers who earn loyalty points when *other* customers buy
 * with their promotional code, instead of on their own purchases.
 *
 * Built on top of existing mechanisms rather than beside them:
 * - the customer discount is a regular Vendure Promotion per code (coupon +
 *   built-in discount action + the `athlete_code` condition), so cart and
 *   checkout apply it through the standard `applyCouponCode` flow;
 * - the athlete's points are credited to the LoyaltyPlugin ledger (new
 *   ATHLETE_REWARD / ATHLETE_REWARD_REVERSAL types), so they're spent with
 *   the exact same redemption flow as any customer's points;
 * - athletes are excluded from regular EARN through LoyaltyService's
 *   earn-policy hook.
 *
 * Requires LoyaltyPlugin, and `athletePermission` registered in
 * `authOptions.customPermissions` (see vendure-config.ts).
 */
@VendurePlugin({
    imports: [PluginCommonModule, LoyaltyPlugin],
    providers: [AthleteService, AthleteRewardService, AthleteEventSubscriber],
    entities: [Athlete, AthleteCode, AthleteReward, AthleteRewardReversal],
    configuration: config => {
        config.promotionOptions.promotionConditions.push(athleteCodeCondition);
        return config;
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [AthletesShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [AthletesAdminResolver, AthleteEntityResolver, AthleteRewardEntityResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class AthletesPlugin {}
