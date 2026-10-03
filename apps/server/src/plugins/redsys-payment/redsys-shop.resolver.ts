import { Args, Mutation, ResolveField, Resolver } from '@nestjs/graphql';
import { ActiveOrderService, Allow, Ctx, OrderService, Permission, RequestContext } from '@vendure/core';
import { ErrorCode } from '@vendure/common/lib/generated-types';

import { RedsysService } from './redsys.service';

// 'REDSYS_PAYMENT_ERROR' se añade al enum ErrorCode con la extensión de esquema de
// este plugin (ver api-extensions.ts); el enum TS generado no lo conoce.
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
     * Lo llama la página de confirmación del pedido con los parámetros
     * Ds_SignatureVersion/Ds_MerchantParameters/Ds_Signature con los que vuelve el
     * navegador desde Redsys: exactamente el mismo contenido firmado que Redsys envía
     * por POST a RedsysController.notify(). Reutiliza handleNotification() tal cual:
     * aquí la seguridad depende por completo de esa comprobación de firma, no de
     * quién llama, así que es público a propósito (no está garantizado que la sesión
     * de Vendure o el pedido activo sigan existiendo cuando carga esta página).
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

// Una segunda clase de resolver solo para que su método de resolución de tipo
// también pueda llamarse `__resolveType`: NestJS/graphql-tools necesita ese nombre
// exacto para registrar el resolveType de una unión (no basta con el decorador
// `@Resolver('TypeName')`), y una clase no puede tener dos métodos con el mismo
// nombre, así que RedsysPaymentFormResult y RedsysConfirmationResult necesitan cada
// uno su clase. Se registra junto a RedsysShopResolver en
// shopApiExtensions.resolvers de redsys-payment.plugin.ts.
@Resolver()
export class RedsysConfirmationTypeResolver {
    @ResolveField()
    @Resolver('RedsysConfirmationResult')
    __resolveType(value: RedsysConfirmationError | { orderCode: string }): string {
        return 'errorCode' in value ? 'RedsysConfirmationError' : 'RedsysConfirmation';
    }
}
