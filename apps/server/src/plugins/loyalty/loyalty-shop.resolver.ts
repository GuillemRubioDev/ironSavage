import { Args, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ErrorCode } from '@vendure/common/lib/generated-types';
import { ActiveOrderService, Allow, Ctx, CustomerService, Order, OrderService, Permission, RequestContext } from '@vendure/core';

import { getLoyaltyConfig } from './loyalty-config';
import { LoyaltyService, RedeemPointsResult } from './loyalty.service';

// Vendure genera automáticamente un valor del enum ErrorCode por cada tipo que
// implementa ErrorResult (nombre en camelCase -> UPPER_SNAKE_CASE):
// LoyaltyRedemptionError pasa a LOYALTY_REDEMPTION_ERROR. El enum TS generado no lo conoce.
const LOYALTY_REDEMPTION_ERROR = 'LOYALTY_REDEMPTION_ERROR' as ErrorCode;

const REASON_MESSAGES: Record<Exclude<RedeemPointsResult, { success: true }>['reason'], string> = {
    BELOW_MINIMUM: 'The number of points requested is below the minimum redeemable amount',
    NO_CUSTOMER: 'No signed-in customer for this order',
    ALREADY_REDEEMED: 'This order already has an active points redemption',
    EXCEEDS_MAX_DISCOUNT: 'This would exceed the maximum discount allowed per order',
    EXCEEDS_ORDER_TOTAL: 'This would exceed the order total',
    INSUFFICIENT_BALANCE: 'Not enough points in the account balance',
};

class LoyaltyRedemptionError {
    readonly errorCode = LOYALTY_REDEMPTION_ERROR;
    readonly message: string;
    constructor(reason: Exclude<RedeemPointsResult, { success: true }>['reason']) {
        this.message = REASON_MESSAGES[reason];
    }
}

@Resolver()
export class LoyaltyShopResolver {
    constructor(
        private loyaltyService: LoyaltyService,
        private customerService: CustomerService,
        private activeOrderService: ActiveOrderService,
        private orderService: OrderService,
    ) {}

    @Query()
    @Allow(Permission.Owner)
    async loyaltyAccount(@Ctx() ctx: RequestContext) {
        const customer = await this.getActiveCustomer(ctx);
        if (!customer) {
            return null;
        }
        return this.loyaltyService.getAccountForCustomer(ctx, customer.id);
    }

    @Query()
    @Allow(Permission.Owner)
    async loyaltyHistory(@Ctx() ctx: RequestContext, @Args() args: { options?: { skip?: number; take?: number } }) {
        const customer = await this.getActiveCustomer(ctx);
        if (!customer) {
            return { items: [], totalItems: 0 };
        }
        return this.loyaltyService.getHistory(ctx, customer.id, args.options);
    }

    @Query()
    @Allow(Permission.Owner, Permission.Public)
    loyaltyProgramConfig() {
        return getLoyaltyConfig();
    }

    @Mutation()
    @Allow(Permission.Owner)
    async redeemLoyaltyPoints(@Ctx() ctx: RequestContext, @Args('points') points: number) {
        const order = await this.getActiveOrder(ctx);
        if (!order) {
            return new LoyaltyRedemptionError('NO_CUSTOMER');
        }
        const result = await this.loyaltyService.redeemPoints(ctx, order, points);
        if (!result.success) {
            return new LoyaltyRedemptionError(result.reason);
        }
        return { discountCents: result.discountCents, balance: result.balance };
    }

    @Mutation()
    @Allow(Permission.Owner)
    async cancelLoyaltyPointsRedemption(@Ctx() ctx: RequestContext): Promise<boolean> {
        const order = await this.getActiveOrder(ctx);
        if (!order) {
            return false;
        }
        const result = await this.loyaltyService.cancelRedemption(ctx, order);
        return result.success;
    }

    @ResolveField()
    @Resolver('RedeemLoyaltyPointsResult')
    __resolveType(value: LoyaltyRedemptionError | { discountCents: number }): string {
        return 'errorCode' in value ? 'LoyaltyRedemptionError' : 'LoyaltyRedemption';
    }

    private async getActiveCustomer(ctx: RequestContext) {
        if (!ctx.activeUserId) {
            return null;
        }
        return (await this.customerService.findOneByUserId(ctx, ctx.activeUserId)) ?? null;
    }

    private async getActiveOrder(ctx: RequestContext): Promise<Order | undefined> {
        const activeOrder = await this.activeOrderService.getActiveOrder(ctx, undefined);
        if (!activeOrder) {
            return undefined;
        }
        return this.orderService.findOne(ctx, activeOrder.id, ['surcharges']);
    }
}
