import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, EventBus, ID, Permission, RequestContext, UserInputError } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoiceResendRequestedEvent } from './invoice-resend-event';
import { InvoicingService } from './invoicing.service';

@Resolver('Invoice')
export class InvoicingAdminResolver {
    constructor(
        private invoicingService: InvoicingService,
        private eventBus: EventBus,
    ) {}

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

    @Mutation()
    @Allow(Permission.ReadOrder)
    async resendInvoice(
        @Ctx() ctx: RequestContext,
        @Args('invoiceId') invoiceId: ID,
        @Args('emailAddress') emailAddress: string,
    ): Promise<boolean> {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
            throw new UserInputError(`"${emailAddress}" is not a valid email address`);
        }
        const invoice = await this.invoicingService.findById(ctx, invoiceId);
        if (!invoice) {
            throw new UserInputError(`No invoice with id ${invoiceId}`);
        }
        const [lines, pdfPath] = await Promise.all([
            this.invoicingService.getLines(ctx, invoice.id),
            this.invoicingService.ensurePdfFile(ctx, invoice),
        ]);
        this.eventBus.publish(new InvoiceResendRequestedEvent(ctx, invoice, lines, pdfPath, emailAddress));
        return true;
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
