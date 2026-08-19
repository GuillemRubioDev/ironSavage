import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, RequestContext } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoicingService } from './invoicing.service';

@Resolver('Invoice')
export class InvoicingAdminResolver {
    constructor(private invoicingService: InvoicingService) {}

    @Query()
    @Allow(Permission.ReadOrder)
    invoices(@Ctx() ctx: RequestContext, @Args() args: { options?: { skip?: number; take?: number; search?: string } }) {
        return this.invoicingService.list(ctx, args.options);
    }

    @Query()
    @Allow(Permission.ReadOrder)
    invoice(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.invoicingService.findById(ctx, id);
    }

    @Query()
    @Allow(Permission.ReadOrder)
    invoiceForOrder(@Ctx() ctx: RequestContext, @Args('orderId') orderId: ID) {
        return this.invoicingService.findByOrderId(ctx, orderId);
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
