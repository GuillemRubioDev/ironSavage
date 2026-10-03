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
     * Records on the session's active order that the customer accepted the
     * terms (version = the legal texts' "last updated" date). Always the
     * active order — never a client-supplied id — and always the server's
     * clock. Called again on every payment attempt, so the record reflects
     * the acceptance that preceded the actual payment.
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
