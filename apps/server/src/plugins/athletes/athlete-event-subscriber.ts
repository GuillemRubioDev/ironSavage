import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CustomerEvent, EventBus, Logger, OrderStateTransitionEvent, RefundStateTransitionEvent } from '@vendure/core';

import { AthleteRewardService } from './athlete-reward.service';
import { AthleteService } from './athlete.service';
import { loggerCtx } from './constants';

/**
 * Wires athlete rewards to the same order/refund lifecycle points the
 * LoyaltyPlugin uses for regular points:
 * - PaymentSettled → grant (never on an intermediate state, so an abandoned
 *   or declined payment never credits anything);
 * - Cancelled → revert whatever hasn't been reverted yet;
 * - Refund Settled → revert a proportional share (partial refunds supported).
 * All three are idempotent in AthleteRewardService.
 * It also removes the athlete role when its customer is deleted.
 */
@Injectable()
export class AthleteEventSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private athleteRewardService: AthleteRewardService,
        private athleteService: AthleteService,
    ) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => {
            if (event.toState === 'PaymentSettled') {
                this.athleteRewardService.grantForOrder(event.ctx, event.order.id).catch(err => {
                    Logger.error(`Failed to grant athlete reward for order ${event.order.code}: ${err}`, loggerCtx);
                });
            }
            if (event.toState === 'Cancelled') {
                this.athleteRewardService.revertForCancellation(event.ctx, event.order.id).catch(err => {
                    Logger.error(`Failed to revert athlete reward for cancelled order ${event.order.code}: ${err}`, loggerCtx);
                });
            }
        });

        // An athlete can't outlive its customer (Vendure soft-deletes customers,
        // so the DB cascade never fires): remove the role and kill its codes.
        this.eventBus.ofType(CustomerEvent).subscribe(event => {
            if (event.type === 'deleted') {
                this.athleteService.removeForDeletedCustomer(event.ctx, event.entity.id).catch(err => {
                    Logger.error(`Failed to remove the athlete role of deleted customer ${event.entity.id}: ${err}`, loggerCtx);
                });
            }
        });

        this.eventBus.ofType(RefundStateTransitionEvent).subscribe(event => {
            if (event.toState === 'Settled') {
                this.athleteRewardService.revertForRefund(event.ctx, event.order, event.refund).catch(err => {
                    Logger.error(`Failed to revert athlete reward for a refund on order ${event.order.code}: ${err}`, loggerCtx);
                });
            }
        });
    }
}
