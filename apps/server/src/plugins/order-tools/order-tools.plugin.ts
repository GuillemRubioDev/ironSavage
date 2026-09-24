import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { OrderToolsController } from './order-tools.controller';
import { OrderToolsService } from './order-tools.service';

/**
 * Small operational helpers for preparing/dispatching paid orders — entirely
 * additive on top of Vendure's own native order/fulfillment features (which
 * already cover marking items as fulfilled/shipped and downloading invoices;
 * see the Dashboard's Fulfill order dialog and the Invoicing plugin):
 *
 * - A printable shipping label per order (`GET /order-tools/shipping-labels?orders=<id,id,...>`),
 *   reachable from a button on the order detail page and as a bulk action on
 *   the order list (select several paid orders, print all their labels).
 * - A printable "orders to prepare today" sheet (`GET /order-tools/daily-orders?date=YYYY-MM-DD`),
 *   listing each paid order's products/quantities, shipping address, and
 *   shipping method — reachable from a button on the order list.
 *
 * Entirely self-contained: no new entities, no change to order/fulfillment
 * behaviour, admin-only (checked manually — see OrderToolsController's doc
 * comment for why `@Allow()` doesn't apply to a plain REST controller here).
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [OrderToolsController],
    providers: [OrderToolsService],
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class OrderToolsPlugin {}
