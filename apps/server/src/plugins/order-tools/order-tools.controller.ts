import { Controller, ForbiddenException, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Ctx, Permission, RequestContext } from '@vendure/core';

import { OrderToolsService } from './order-tools.service';
import { ORDER_STATES_TO_PREPARE } from './warehouse-order-process';

/**
 * Plain REST (not GraphQL) so a plain `window.open(url)` from the Dashboard
 * can hand the browser a standalone printable HTML page — same reasoning as
 * InvoicingController being REST for its PDF stream. See that controller's
 * doc comment for why `@Allow()` doesn't work here and permissions are
 * checked manually instead.
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
        // Default: every paid order that hasn't shipped yet (paid, in preparation, prepared).
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
