import { Args, Mutation, ResolveField, Resolver } from '@nestjs/graphql';
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

class RedsysConfirmationError {
    readonly errorCode = REDSYS_PAYMENT_ERROR;
    constructor(readonly message: string) {}
}

interface ConfirmRedsysPaymentInput {
    signatureVersion?: string | null;
    merchantParameters: string;
    signature: string;
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

    /**
     * Fed by the order-confirmation page with the Ds_SignatureVersion/
     * Ds_MerchantParameters/Ds_Signature query params Redsys' redirect lands the
     * browser back with — the exact same signed payload Redsys also POSTs
     * server-to-server to RedsysController.notify(). Reuses handleNotification()
     * as-is: correctness here depends entirely on that signature check, not on
     * who's calling, so this is deliberately public (no Vendure session/active
     * order is guaranteed to still exist by the time this page loads).
     */
    @Mutation()
    @Allow(Permission.Public)
    async confirmRedsysPayment(@Ctx() ctx: RequestContext, @Args('input') input: ConfirmRedsysPaymentInput) {
        try {
            const result = await this.redsysService.handleNotification(
                {
                    Ds_SignatureVersion: input.signatureVersion ?? undefined,
                    Ds_MerchantParameters: input.merchantParameters,
                    Ds_Signature: input.signature,
                },
                ctx.req!,
            );
            return result;
        } catch (err) {
            return new RedsysConfirmationError(err instanceof Error ? err.message : String(err));
        }
    }

}

// A second resolver class, purely so its type-resolver method can also be
// named `__resolveType` — NestJS/graphql-tools requires that literal method
// name to register a union's resolveType (the `@Resolver('TypeName')`
// decorator alone isn't enough), and a class can't have two same-named
// methods, so RedsysPaymentFormResult and RedsysConfirmationResult each need
// their own class. Registered alongside RedsysShopResolver in
// redsys-payment.plugin.ts's shopApiExtensions.resolvers.
@Resolver()
export class RedsysConfirmationTypeResolver {
    @ResolveField()
    @Resolver('RedsysConfirmationResult')
    __resolveType(value: RedsysConfirmationError | { orderCode: string }): string {
        return 'errorCode' in value ? 'RedsysConfirmationError' : 'RedsysConfirmation';
    }
}
