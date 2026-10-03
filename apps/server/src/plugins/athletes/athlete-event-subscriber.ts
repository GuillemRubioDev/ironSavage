import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CustomerEvent, EventBus, Logger, OrderStateTransitionEvent, RefundStateTransitionEvent } from '@vendure/core';

import { AthleteRewardService } from './athlete-reward.service';
import { AthleteService } from './athlete.service';
import { loggerCtx } from './constants';

/**
 * Conecta las recompensas de los atletas a los mismos momentos del ciclo de vida
 * de pedidos y reembolsos que usa LoyaltyPlugin para los puntos normales:
 * - PaymentSettled → se concede (nunca en un estado intermedio, para que un pago
 *   abandonado o rechazado no abone nada);
 * - Cancelled → se revierte lo que aún no se haya revertido;
 * - Reembolso Settled → se revierte la parte proporcional (admite reembolsos parciales).
 * Las tres son idempotentes en AthleteRewardService.
 * También quita el rol de atleta cuando se borra su cliente.
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

        // Un atleta no puede existir sin su cliente (Vendure borra los clientes de
        // forma lógica, así que la cascada de la base de datos nunca salta): se quita
        // el rol y se desactivan sus códigos.
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
