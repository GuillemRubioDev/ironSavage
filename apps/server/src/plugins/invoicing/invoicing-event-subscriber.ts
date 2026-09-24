import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, Logger, OrderService, OrderStateTransitionEvent } from '@vendure/core';

import { loggerCtx } from './constants';
import { InvoiceGeneratedEvent } from './invoice-generated-event';
import { InvoicingService } from './invoicing.service';

/**
 * Fires invoice generation at the same trigger point Loyalty uses for
 * earning points: the Order's transition to `PaymentSettled` — a confirmed,
 * actually-collected payment, not an intermediate state like
 * ArrangingPayment. A cancelled/never-settled order never reaches this
 * event, so it never gets an invoice.
 */
@Injectable()
export class InvoicingEventSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private invoicingService: InvoicingService,
        private orderService: OrderService,
    ) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => {
            if (event.toState !== 'PaymentSettled') {
                return;
            }
            this.generateInvoice(event).catch(err => {
                Logger.error(`Failed to generate invoice for order ${event.order.code}: ${err}`, loggerCtx);
            });
        });
    }

    private async generateInvoice(event: OrderStateTransitionEvent): Promise<void> {
        const order = await this.orderService.findOne(event.ctx, event.order.id, [
            'lines.productVariant',
            'lines.productVariant.product.featuredAsset',
            'shippingLines',
            'surcharges',
            'customer',
        ]);
        if (!order) {
            return;
        }
        const result = await this.invoicingService.generateForOrder(event.ctx, order);
        if (result.created) {
            const [lines, pdfPath] = await Promise.all([
                this.invoicingService.getLines(event.ctx, result.invoice.id),
                this.invoicingService.ensurePdfFile(event.ctx, result.invoice),
            ]);
            this.eventBus.publish(new InvoiceGeneratedEvent(event.ctx, result.invoice, lines, pdfPath));
        }
    }
}
