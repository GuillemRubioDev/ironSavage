import { createReadStream } from 'fs';
import { Controller, ForbiddenException, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Ctx, CustomerService, Permission, RequestContext } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoicingService } from './invoicing.service';

/**
 * Plain REST (not GraphQL) so the response can stream a PDF binary directly —
 * matches how RedsysController is also a REST route for a non-GraphQL-shaped
 * concern.
 *
 * No `@Allow()` here, deliberately: Vendure's `getApiType()` returns
 * `'custom'` for any request with no GraphQL `info` (i.e. every plain REST
 * controller), and the default `EntityAccessControlStrategy.canAccess()`
 * checks declared permissions against that apiType — so a declarative
 * `@Allow(Permission.Authenticated)` here rejects even a genuinely logged-in
 * admin or customer. `@Ctx()` still resolves the real session from the
 * cookie regardless of apiType (session lookup doesn't depend on it), so
 * `ctx.userHasPermissions()` / `ctx.activeUserId` inside the handler are
 * exactly as reliable as they'd be in a resolver — only the *guard's own*
 * declarative gate is unusable here. See `assertCanDownload` for the real check.
 */
@Controller('invoices')
export class InvoicingController {
    constructor(
        private invoicingService: InvoicingService,
        private customerService: CustomerService,
    ) {}

    @Get(':id/pdf')
    async downloadPdf(@Ctx() ctx: RequestContext, @Param('id') id: string, @Res() res: Response): Promise<void> {
        const invoice = await this.invoicingService.findById(ctx, id);
        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }
        await this.assertCanDownload(ctx, invoice);

        const filePath = await this.invoicingService.ensurePdfFile(ctx, invoice);
        const fileName = `${invoice.series}-${String(invoice.number).padStart(6, '0')}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        createReadStream(filePath).pipe(res);
    }

    /**
     * Admin/staff users are identified by an actual ReadOrder permission
     * grant (not by apiType, which is unreliable here — see class doc);
     * shop customers are identified by owning the order the invoice belongs to.
     */
    private async assertCanDownload(ctx: RequestContext, invoice: Invoice): Promise<void> {
        if (ctx.userHasPermissions([Permission.ReadOrder])) {
            return;
        }
        if (ctx.activeUserId) {
            const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
            if (customer && String(customer.id) === String(invoice.customerId)) {
                return;
            }
        }
        throw new ForbiddenException();
    }
}
