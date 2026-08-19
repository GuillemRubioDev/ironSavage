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
 * Wires the ledger to Vendure's own order/refund lifecycle. Kept separate
 * from LoyaltyService so the service itself stays a plain, directly
 * testable set of methods with no event-bus machinery in the way.
 */
@Injectable()
export class LoyaltyEventSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private loyaltyService: LoyaltyService,
        private orderService: OrderService,
    ) {}

    onApplicationBootstrap(): void {
        // Points are only ever granted on confirmed, settled payment — never on
        // an intermediate state like ArrangingPayment — so PaymentSettled is the
        // one transition this subscribes to for EARN.
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
