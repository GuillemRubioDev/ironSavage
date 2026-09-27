import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';

import { LoyaltyService } from './loyalty.service';
import { logSecurityEvent } from '../security/security-events';

interface AdjustLoyaltyPointsInput {
    customerId: ID;
    points: number;
    description: string;
}

@Resolver()
export class LoyaltyAdminResolver {
    constructor(private loyaltyService: LoyaltyService) {}

    @Query()
    @Allow(Permission.ReadCustomer)
    customerLoyaltyAccount(@Ctx() ctx: RequestContext, @Args('customerId') customerId: ID) {
        return this.loyaltyService.getAccountForCustomer(ctx, customerId);
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    customerLoyaltyHistory(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: ID,
        @Args('options') options?: { skip?: number; take?: number },
    ) {
        return this.loyaltyService.getHistory(ctx, customerId, options);
    }

    @Mutation()
    @Allow(Permission.UpdateCustomer)
    async adjustLoyaltyPoints(@Ctx() ctx: RequestContext, @Args('input') input: AdjustLoyaltyPointsInput) {
        const result = await this.loyaltyService.adjustBalance(ctx, input.customerId, input.points, input.description);
        logSecurityEvent('admin_adjust_loyalty_points', {
            adminUserId: ctx.activeUserId ? String(ctx.activeUserId) : undefined,
            customerId: String(input.customerId),
            points: input.points,
        });
        return result;
    }
}
