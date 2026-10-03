import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    EventBus,
    Logger,
    OrderService,
    OrderStateTransitionEvent,
    Refund,
    RefundStateTransitionEvent,
    TransactionalConnection,
} from '@vendure/core';

import { loggerCtx } from './constants';
import { InvoiceGeneratedEvent } from './invoice-generated-event';
import { InvoicingService } from './invoicing.service';

/**
 * Genera la factura en el mismo momento en que la fidelización da los puntos: la
 * transición del pedido a `PaymentSettled`, un pago confirmado y cobrado de verdad,
 * no un estado intermedio como ArrangingPayment. Un pedido cancelado o nunca
 * pagado no llega a este evento, así que nunca tiene factura.
 *
 * Un reembolso que llega a `Settled` (reembolso parcial o «Reembolsar y cancelar»)
 * genera una factura rectificativa; ver InvoicingService.generateRectifyingForRefund.
 */
@Injectable()
export class InvoicingEventSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private invoicingService: InvoicingService,
        private orderService: OrderService,
        private connection: TransactionalConnection,
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
        this.eventBus.ofType(RefundStateTransitionEvent).subscribe(event => {
            if (event.toState !== 'Settled') {
                return;
            }
            this.generateRectifyingInvoice(event).catch(err => {
                Logger.error(`Failed to generate rectifying invoice for refund ${event.refund.id} (order ${event.order.code}): ${err}`, loggerCtx);
            });
        });
    }

    private async generateRectifyingInvoice(event: RefundStateTransitionEvent): Promise<void> {
        const [order, refund] = await Promise.all([
            this.orderService.findOne(event.ctx, event.order.id, ['lines.productVariant', 'shippingLines', 'customer']),
            this.connection.getRepository(event.ctx, Refund).findOne({ where: { id: event.refund.id }, relations: ['lines'] }),
        ]);
        if (!order || !refund) {
            return;
        }
        const result = await this.invoicingService.generateRectifyingForRefund(event.ctx, order, refund);
        if (result?.created) {
            const [lines, pdfPath] = await Promise.all([
                this.invoicingService.getLines(event.ctx, result.invoice.id),
                this.invoicingService.ensurePdfFile(event.ctx, result.invoice),
            ]);
            this.eventBus.publish(new InvoiceGeneratedEvent(event.ctx, result.invoice, lines, pdfPath));
        }
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
