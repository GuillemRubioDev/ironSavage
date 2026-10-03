import { Controller, ForbiddenException, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Ctx, Permission, RequestContext } from '@vendure/core';

import { OrderToolsService } from './order-tools.service';
import { ORDER_STATES_TO_PREPARE } from './warehouse-order-process';

/**
 * REST simple (no GraphQL) para que un `window.open(url)` desde el dashboard abra
 * en el navegador una página HTML imprimible independiente, por el mismo motivo por
 * el que InvoicingController es REST para su PDF. El comentario de ese controlador
 * explica por qué `@Allow()` no funciona aquí y los permisos se comprueban a mano.
 */
@Controller('order-tools')
export class OrderToolsController {
    constructor(private orderToolsService: OrderToolsService) {}

    @Get('shipping-labels')
    async shippingLabels(@Ctx() ctx: RequestContext, @Query('orders') orderIds: string, @Res() res: Response): Promise<void> {
        this.assertCanReadOrders(ctx);
        const ids = (orderIds ?? '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
        const orders = await this.orderToolsService.getOrdersByIds(ctx, ids);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(this.orderToolsService.renderShippingLabelsPage(orders));
    }

    @Get('daily-orders')
    async dailyOrders(
        @Ctx() ctx: RequestContext,
        @Query('date') dateParam: string | undefined,
        @Query('state') state: string | undefined,
        @Res() res: Response,
    ): Promise<void> {
        this.assertCanReadOrders(ctx);
        const day = dateParam ? new Date(dateParam) : new Date();
        // Por defecto: todos los pedidos pagados aún sin enviar (pagado, preparando, preparado).
        const orders = await this.orderToolsService.getOrdersForDay(ctx, day, state ? [state] : [...ORDER_STATES_TO_PREPARE]);
        const methodNames = await this.orderToolsService.resolveShippingMethodNames(ctx, orders);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(this.orderToolsService.renderDailyOrdersPage(orders, day, methodNames));
    }

    private assertCanReadOrders(ctx: RequestContext): void {
        if (!ctx.userHasPermissions([Permission.ReadOrder])) {
            throw new ForbiddenException();
        }
    }
}
