import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    EventBus,
    ID,
    Logger,
    OrderService,
    OrderStateTransitionEvent,
    RefundStateTransitionEvent,
    RequestContext,
} from '@vendure/core';

import { loggerCtx } from './constants';
import { LoyaltyService } from './loyalty.service';

/**
 * Conecta el libro de movimientos con el ciclo de vida de pedidos y reembolsos de
 * Vendure. Separado de LoyaltyService para que el servicio sea un conjunto de
 * métodos simple y fácil de testear, sin la maquinaria del bus de eventos.
 */
@Injectable()
export class LoyaltyEventSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private loyaltyService: LoyaltyService,
        private orderService: OrderService,
    ) {}

    onApplicationBootstrap(): void {
        // Los puntos solo se dan con el pago confirmado y cobrado, nunca en un estado
        // intermedio como ArrangingPayment: PaymentSettled es la única transición que
        // se escucha para EARN.
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => {
            if (event.toState === 'PaymentSettled') {
                this.loyaltyService.earnForOrder(event.ctx, event.order).catch(err => {
                    Logger.error(`Failed to earn loyalty points for order ${event.order.code}: ${err}`, loggerCtx);
                });
            }
            if (event.toState === 'Cancelled') {
                this.reclaimAnyActiveRedemption(event.ctx, event.order.id).catch(err => {
                    Logger.error(`Failed to revert loyalty redemption for cancelled order ${event.order.code}: ${err}`, loggerCtx);
                });
            }
        });

        this.eventBus.ofType(RefundStateTransitionEvent).subscribe(event => {
            if (event.toState === 'Settled') {
                this.loyaltyService.revertForRefund(event.ctx, event.order, event.refund).catch(err => {
                    Logger.error(`Failed to revert loyalty points for a refund on order ${event.order.code}: ${err}`, loggerCtx);
                });
            }
        });
    }

    private async reclaimAnyActiveRedemption(ctx: RequestContext, orderId: ID): Promise<void> {
        const order = await this.orderService.findOne(ctx, orderId, ['surcharges']);
        if (order) {
            await this.loyaltyService.cancelRedemption(ctx, order);
        }
    }
}
