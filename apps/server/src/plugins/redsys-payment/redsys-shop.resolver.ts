import { Mutation, ResolveField, Resolver } from '@nestjs/graphql';
import { ActiveOrderService, Allow, Ctx, OrderService, Permission, RequestContext } from '@vendure/core';
import { ErrorCode } from '@vendure/common/lib/generated-types';

import { RedsysService } from './redsys.service';

// 'REDSYS_PAYMENT_ERROR' is added to the ErrorCode enum via this plugin's schema
// extension (see api-extensions.ts); the generated TS enum doesn't know about it.
const REDSYS_PAYMENT_ERROR = 'REDSYS_PAYMENT_ERROR' as ErrorCode;

class RedsysPaymentFormError {
    readonly errorCode = REDSYS_PAYMENT_ERROR;
    constructor(readonly message: string) {}
}

@Resolver()
export class RedsysShopResolver {
    constructor(
        private redsysService: RedsysService,
        private activeOrderService: ActiveOrderService,
        private orderService: OrderService,
    ) {}

    @Mutation()
    @Allow(Permission.Owner)
    async createRedsysPaymentForm(@Ctx() ctx: RequestContext) {
        const activeOrder = await this.activeOrderService.getActiveOrder(ctx, undefined);
        if (!activeOrder) {
            return new RedsysPaymentFormError('No active order found for this session');
        }

        const order = await this.orderService.findOne(ctx, activeOrder.id, ['lines']);
        if (!order) {
            return new RedsysPaymentFormError('No active order found for this session');
        }

        const result = await this.redsysService.buildPaymentForm(ctx, order);
        if (!result.success) {
            return new RedsysPaymentFormError(result.message);
        }
        return result.form;
    }

    @ResolveField()
    @Resolver('RedsysPaymentFormResult')
    __resolveType(value: RedsysPaymentFormError | { url: string }): string {
        return 'errorCode' in value ? 'RedsysPaymentFormError' : 'RedsysPaymentForm';
    }
}
