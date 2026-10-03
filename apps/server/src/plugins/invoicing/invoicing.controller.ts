import { createReadStream } from 'fs';
import { Controller, ForbiddenException, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Ctx, CustomerService, Permission, RequestContext } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoicingService } from './invoicing.service';

/**
 * REST simple (no GraphQL) para poder devolver el PDF en binario directamente,
 * igual que RedsysController es una ruta REST para algo que no encaja en GraphQL.
 *
 * Sin `@Allow()` a propósito: `getApiType()` de Vendure devuelve `'custom'` en
 * cualquier petición sin `info` de GraphQL (es decir, en todo controlador REST), y
 * `EntityAccessControlStrategy.canAccess()` comprueba los permisos declarados contra
 * ese apiType, así que un `@Allow(Permission.Authenticated)` aquí rechazaría incluso
 * a un administrador o cliente con la sesión iniciada. `@Ctx()` sigue obteniendo la
 * sesión real de la cookie sea cual sea el apiType, así que `ctx.userHasPermissions()`
 * y `ctx.activeUserId` son tan fiables como en un resolver: solo la barrera
 * declarativa del guard no sirve aquí. La comprobación real está en `assertCanDownload`.
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
     * El personal de administración se reconoce por tener de verdad el permiso
     * ReadOrder (no por el apiType, que aquí no es fiable; ver el comentario de la
     * clase); los clientes de la tienda, por ser dueños del pedido de la factura.
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
