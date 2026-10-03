import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
    ActiveOrderService,
    Allow,
    Ctx,
    Order,
    Permission,
    RequestContext,
    Transaction,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';

import { isValidTermsVersion } from './terms-acceptance';

@Resolver()
export class LegalAcceptanceShopResolver {
    constructor(
        private activeOrderService: ActiveOrderService,
        private connection: TransactionalConnection,
    ) {}

    /**
     * Anota en el pedido activo de la sesión que el cliente aceptó las condiciones
     * (versión = fecha de «última actualización» de los textos legales). Siempre el
     * pedido activo, nunca un id enviado por el navegador, y siempre con el reloj del
     * servidor. Se vuelve a llamar en cada intento de pago, para que el registro
     * refleje la aceptación previa al pago real.
     */
    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateOrder, Permission.Owner)
    async acceptTermsForActiveOrder(@Ctx() ctx: RequestContext, @Args() args: { version: string }): Promise<boolean> {
        if (!isValidTermsVersion(args.version)) {
            throw new UserInputError('Invalid terms version (expected YYYY-MM-DD)');
        }
        const order = await this.activeOrderService.getActiveOrder(ctx, undefined);
        if (!order) {
            throw new UserInputError('There is no active order');
        }
        await this.connection
            .getRepository(ctx, Order)
            .update(order.id, { customFields: { termsAcceptedAt: new Date(), termsVersion: args.version } });
        return true;
    }
}
