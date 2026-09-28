import { Args, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, CustomerService, Permission, RequestContext } from '@vendure/core';

import { AthleteRewardService } from './athlete-reward.service';
import { AthleteService } from './athlete.service';

/**
 * Owner-scoped: the athlete is always resolved from the session, never from
 * a client-supplied id, so nobody can read another athlete's panel. The
 * reward rows are mapped to an explicit allow-list of fields — the customer
 * who placed the order is never exposed to the athlete.
 */
@Resolver()
export class AthletesShopResolver {
    constructor(
        private athleteService: AthleteService,
        private athleteRewardService: AthleteRewardService,
        private customerService: CustomerService,
    ) {}

    @Query()
    @Allow(Permission.Owner)
    async myAthleteProfile(@Ctx() ctx: RequestContext) {
        const athlete = await this.getActiveAthlete(ctx);
        if (!athlete) {
            return null;
        }
        const stats = await this.athleteRewardService.getStats(ctx, athlete.id);
        return {
            enabled: athlete.enabled,
            codes: athlete.codes.map(code => ({
                code: code.code,
                enabled: code.enabled && athlete.enabled,
                discountType: code.discountType,
                discountValue: code.discountValue,
                rewardType: code.rewardType,
                rewardValue: code.rewardValue,
            })),
            ...stats,
        };
    }

    @Query()
    @Allow(Permission.Owner)
    async myAthleteRewards(@Ctx() ctx: RequestContext, @Args() args: { options?: { skip?: number; take?: number } }) {
        const athlete = await this.getActiveAthlete(ctx);
        if (!athlete) {
            return { items: [], totalItems: 0 };
        }
        const { items, totalItems } = await this.athleteRewardService.listRewards(ctx, athlete.id, args.options);
        return {
            totalItems,
            items: items.map(reward => ({
                id: reward.id,
                createdAt: reward.createdAt,
                code: reward.code,
                orderCode: reward.orderCode,
                baseAmount: reward.baseAmount,
                currencyCode: reward.currencyCode,
                points: reward.points,
                revertedPoints: reward.revertedPoints,
                status: reward.status,
            })),
        };
    }

    private async getActiveAthlete(ctx: RequestContext) {
        if (!ctx.activeUserId) {
            return null;
        }
        const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
        if (!customer) {
            return null;
        }
        return this.athleteService.findByCustomerId(ctx, customer.id);
    }
}
