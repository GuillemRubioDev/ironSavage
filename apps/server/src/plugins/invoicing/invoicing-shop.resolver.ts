import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, CustomerService, ID, Permission, RequestContext } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoicingService } from './invoicing.service';

@Resolver('Invoice')
export class InvoicingShopResolver {
    constructor(
        private invoicingService: InvoicingService,
        private customerService: CustomerService,
    ) {}

    /**
     * Siempre limitado al cliente de la sesión iniciada: ni siquiera existe un
     * argumento de id de cliente que aceptar, así que no se le puede engañar para
     * devolver facturas de otro.
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

    /**
     * Limitado igual que myInvoices() (se obtiene de la sesión, nunca de un id de
     * cliente enviado por el navegador) y además comprueba el customerId de la propia
     * factura, para que pasar el orderId de otro cliente no filtre su factura.
     */
    @Query()
    @Allow(Permission.Owner)
    async myInvoiceForOrder(@Ctx() ctx: RequestContext, @Args('orderId') orderId: ID) {
        if (!ctx.activeUserId) {
            return null;
        }
        const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
        if (!customer) {
            return null;
        }
        const invoice = await this.invoicingService.findByOrderId(ctx, orderId);
        if (!invoice || String(invoice.customerId) !== String(customer.id)) {
            return null;
        }
        return invoice;
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
