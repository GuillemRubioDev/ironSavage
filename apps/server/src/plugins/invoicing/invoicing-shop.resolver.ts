import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, CustomerService, Permission, RequestContext } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoicingService } from './invoicing.service';

@Resolver('Invoice')
export class InvoicingShopResolver {
    constructor(
        private invoicingService: InvoicingService,
        private customerService: CustomerService,
    ) {}

    /**
     * Always scoped to the signed-in session's own customer — there is no
     * customer-id argument to accept from the client in the first place, so
     * this can't be tricked into returning someone else's invoices.
     */
    @Query()
    @Allow(Permission.Owner)
    async myInvoices(@Ctx() ctx: RequestContext, @Args() args: { options?: { skip?: number; take?: number } }) {
        if (!ctx.activeUserId) {
            return { items: [], totalItems: 0 };
        }
        const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
        if (!customer) {
            return { items: [], totalItems: 0 };
        }
        return this.invoicingService.list(ctx, { ...args.options, customerId: customer.id });
    }

    @ResolveField()
    formattedNumber(@Parent() invoice: Invoice): string {
        return `${invoice.series}-${String(invoice.number).padStart(6, '0')}`;
    }

    @ResolveField()
    hasPdf(@Parent() invoice: Invoice): boolean {
        return !!invoice.pdfPath;
    }

    @ResolveField()
    lines(@Ctx() ctx: RequestContext, @Parent() invoice: Invoice) {
        return this.invoicingService.getLines(ctx, invoice.id);
    }
}
