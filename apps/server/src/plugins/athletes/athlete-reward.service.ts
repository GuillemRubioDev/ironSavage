import { Injectable } from '@nestjs/common';
import { ID, idsAreEqual, Logger, Order, OrderService, PaginatedList, RequestContext, TransactionalConnection } from '@vendure/core';
import { In } from 'typeorm';

import { getLoyaltyConfig } from '../loyalty/loyalty-config';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { AthleteReward } from './athlete-reward.entity';
import { AthleteRewardReversal } from './athlete-reward-reversal.entity';
import { calculateRefundReversal, calculateRewardPoints, firstAthleteCode, rewardStatusFor } from './athlete-rules';
import { AthleteReversalReason, loggerCtx } from './constants';

export interface AthleteRewardStats {
    totalRewardPoints: number;
    revertedRewardPoints: number;
    netRewardPoints: number;
    rewardedOrders: number;
}

type OrderForReward = Pick<Order, 'id' | 'code' | 'customerId' | 'couponCodes' | 'subTotalWithTax' | 'currencyCode' | 'promotions'> & {
    discounts: Array<{ adjustmentSource: string; amountWithTax: number }>;
};

/**
 * Concede y revierte las recompensas de los atletas según el ciclo de vida del
 * pedido (ver AthleteEventSubscriber). La idempotencia nunca depende solo de
 * «comprobar y luego actuar»: cada concesión o reversión inserta primero una fila
 * protegida por un índice único (AthleteReward.orderId, índices parciales de
 * AthleteRewardReversal) en la misma transacción que el apunte en el libro, así
 * que un evento duplicado o simultáneo falla en ese insert y se deshace toda su
 * transacción, incluido el abono de puntos.
 */
@Injectable()
export class AthleteRewardService {
    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private loyaltyService: LoyaltyService,
    ) {}

    /** Se llama cuando un pedido llega a PaymentSettled. */
    async grantForOrder(ctx: RequestContext, orderId: ID): Promise<{ granted: boolean; points?: number; reason?: string }> {
        const order = await this.loadOrder(ctx, orderId);
        if (!order) {
            return { granted: false, reason: 'ORDER_NOT_FOUND' };
        }
        return this.grantForLoadedOrder(ctx, order);
    }

    async grantForLoadedOrder(ctx: RequestContext, order: OrderForReward): Promise<{ granted: boolean; points?: number; reason?: string }> {
        const promotionIds = (order.promotions ?? []).map(p => p.id);
        if (promotionIds.length === 0) {
            return { granted: false, reason: 'NO_ATHLETE_CODE' };
        }
        // Solo cuentan los códigos cuya Promotion se aplicó de verdad al pedido: si
        // la condición athlete_code la rechazó (código propio, atleta desactivado,
        // segundo código de atleta), no hubo descuento y no hay recompensa.
        const candidates = await this.connection.getRepository(ctx, AthleteCode).find({
            where: { promotionId: In(promotionIds) },
            relations: { athlete: true },
        });
        if (candidates.length === 0) {
            return { granted: false, reason: 'NO_ATHLETE_CODE' };
        }
        const winnerCode = firstAthleteCode(order.couponCodes ?? [], candidates.map(c => c.code));
        const athleteCode = candidates.find(c => c.code === winnerCode) ?? candidates[0];
        const athlete = athleteCode.athlete;

        if (!athlete.enabled || athlete.deletedAt) {
            return { granted: false, reason: 'ATHLETE_DISABLED' };
        }
        if (order.customerId && idsAreEqual(order.customerId, athlete.customerId)) {
            // Doble protección: la condición de la promoción ya lo impide.
            return { granted: false, reason: 'OWN_CODE' };
        }

        const existing = await this.connection.getRepository(ctx, AthleteReward).findOne({ where: { orderId: order.id } });
        if (existing) {
            return { granted: false, reason: 'ALREADY_GRANTED' };
        }

        const { pointValueInCents } = getLoyaltyConfig();
        const baseAmount = Math.max(0, order.subTotalWithTax);
        const points = calculateRewardPoints(athleteCode.rewardType, athleteCode.rewardValue, baseAmount, pointValueInCents);
        const promotionSource = `PROMOTION:${athleteCode.promotionId}`;
        const customerDiscountAmount = -order.discounts
            .filter(d => d.adjustmentSource === promotionSource)
            .reduce((sum, d) => sum + d.amountWithTax, 0);

        try {
            return await this.connection.withTransaction(ctx, async txCtx => {
                const reward = await this.connection.getRepository(txCtx, AthleteReward).save(
                    new AthleteReward({
                        athleteId: athlete.id,
                        athleteCodeId: athleteCode.id,
                        code: athleteCode.code,
                        orderId: order.id,
                        orderCode: order.code,
                        customerId: order.customerId ?? null,
                        baseAmount,
                        customerDiscountAmount: Math.max(0, Math.round(customerDiscountAmount)),
                        currencyCode: order.currencyCode,
                        discountType: athleteCode.discountType,
                        discountValue: athleteCode.discountValue,
                        rewardType: athleteCode.rewardType,
                        rewardValue: athleteCode.rewardValue,
                        pointValueInCents,
                        points,
                        revertedPoints: 0,
                        unrecoveredPoints: 0,
                        status: 'ACTIVE',
                        loyaltyTransactionId: null,
                    }),
                );
                if (points > 0) {
                    const transaction = await this.loyaltyService.creditPoints(
                        txCtx,
                        athlete.customerId,
                        points,
                        'ATHLETE_REWARD',
                        order.id,
                        `Athlete code ${athleteCode.code} used on order ${order.code}`,
                    );
                    await this.connection
                        .getRepository(txCtx, AthleteReward)
                        .update({ id: reward.id }, { loyaltyTransactionId: transaction.id });
                }
                Logger.info(`Granted ${points} athlete reward points to athlete ${athlete.id} for order ${order.code}`, loggerCtx);
                return { granted: true, points };
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                Logger.info(`Order ${order.code} already granted an athlete reward (duplicate event)`, loggerCtx);
                return { granted: false, reason: 'ALREADY_GRANTED' };
            }
            throw err;
        }
    }

    /** Se llama al cancelar un pedido: revierte la parte de la recompensa que aún no se haya revertido. */
    async revertForCancellation(ctx: RequestContext, orderId: ID): Promise<{ reverted: number }> {
        const reward = await this.connection.getRepository(ctx, AthleteReward).findOne({ where: { orderId } });
        if (!reward) {
            return { reverted: 0 };
        }
        return this.applyReversal(ctx, reward.id, 'ORDER_CANCELLED', r => r.points - r.revertedPoints, {
            note: `Order ${reward.orderCode} cancelled`,
        });
    }

    /** Se llama al liquidarse un reembolso: revierte la parte proporcional, una vez por reembolso. */
    async revertForRefund(
        ctx: RequestContext,
        order: Pick<Order, 'id' | 'totalWithTax'>,
        refund: { id: ID; total: number },
    ): Promise<{ reverted: number }> {
        const reward = await this.connection.getRepository(ctx, AthleteReward).findOne({ where: { orderId: order.id } });
        if (!reward) {
            return { reverted: 0 };
        }
        return this.applyReversal(
            ctx,
            reward.id,
            'REFUND',
            r => calculateRefundReversal(r.points, r.revertedPoints, refund.total, order.totalWithTax),
            { refundId: refund.id, note: `Refund on order ${reward.orderCode}` },
        );
    }

    /** Acción de administración: anula lo que quede de una recompensa (p. ej. un pedido fraudulento). */
    async revertManually(ctx: RequestContext, rewardId: ID, note: string, administratorUserId?: ID): Promise<{ reverted: number }> {
        return this.applyReversal(ctx, rewardId, 'MANUAL', r => r.points - r.revertedPoints, {
            note: note.trim() || 'Manual reversal',
            administratorUserId,
        });
    }

    async findRewardById(ctx: RequestContext, id: ID): Promise<AthleteReward | null> {
        return this.connection.getRepository(ctx, AthleteReward).findOne({
            where: { id },
            relations: { reversals: true },
        });
    }

    async listRewards(
        ctx: RequestContext,
        athleteId: ID,
        options?: { skip?: number; take?: number },
    ): Promise<PaginatedList<AthleteReward>> {
        const [items, totalItems] = await this.connection.getRepository(ctx, AthleteReward).findAndCount({
            where: { athleteId },
            relations: { reversals: true },
            order: { createdAt: 'DESC' },
            skip: options?.skip ?? 0,
            take: Math.min(options?.take ?? 50, 100),
        });
        return { items, totalItems };
    }

    async getStats(ctx: RequestContext, athleteId: ID): Promise<AthleteRewardStats> {
        const raw = await this.connection
            .getRepository(ctx, AthleteReward)
            .createQueryBuilder('reward')
            .select('COALESCE(SUM(reward.points), 0)', 'total')
            .addSelect('COALESCE(SUM(reward.revertedPoints), 0)', 'reverted')
            .addSelect('COUNT(reward.id)', 'orders')
            .where('reward.athleteId = :athleteId', { athleteId })
            .getRawOne<{ total: string; reverted: string; orders: string }>();
        const totalRewardPoints = Number(raw?.total ?? 0);
        const revertedRewardPoints = Number(raw?.reverted ?? 0);
        return {
            totalRewardPoints,
            revertedRewardPoints,
            netRewardPoints: totalRewardPoints - revertedRewardPoints,
            rewardedOrders: Number(raw?.orders ?? 0),
        };
    }

    /**
     * Todos los pedidos con este código aplicado, incluidos los que nunca generaron
     * recompensa (aún sin pagar, cancelados antes del pago, código propio…).
     * `couponCodes` es un simple-array de TypeORM (texto separado por comas), de ahí
     * el LIKE con delimitadores; los códigos no pueden llevar comas (ATHLETE_CODE_PATTERN).
     */
    async listOrdersForCode(
        ctx: RequestContext,
        codeId: ID,
        options?: { skip?: number; take?: number },
    ): Promise<PaginatedList<Order>> {
        const code = await this.connection.getRepository(ctx, AthleteCode).findOne({ where: { id: codeId } });
        if (!code) {
            return { items: [], totalItems: 0 };
        }
        const [items, totalItems] = await this.connection
            .getRepository(ctx, Order)
            .createQueryBuilder('order')
            .leftJoinAndSelect('order.customer', 'customer')
            .where(`(',' || LOWER(order.couponCodes) || ',') LIKE :pattern`, { pattern: `%,${code.code.toLowerCase()},%` })
            .orderBy('order.createdAt', 'DESC')
            .skip(options?.skip ?? 0)
            .take(Math.min(options?.take ?? 50, 100))
            .getManyAndCount();
        return { items, totalItems };
    }

    private async applyReversal(
        ctx: RequestContext,
        rewardId: ID,
        reason: AthleteReversalReason,
        pointsToRevert: (reward: AthleteReward) => number,
        extra: { refundId?: ID; note?: string; administratorUserId?: ID },
    ): Promise<{ reverted: number }> {
        try {
            return await this.connection.withTransaction(ctx, async txCtx => {
                const rewardRepo = this.connection.getRepository(txCtx, AthleteReward);
                // Bloqueo de fila: serializa las reversiones simultáneas de la misma
                // recompensa para que no lean las dos el mismo «puntos restantes».
                const reward = await rewardRepo.findOne({ where: { id: rewardId }, lock: { mode: 'pessimistic_write' } });
                if (!reward) {
                    return { reverted: 0 };
                }
                const reversalRepo = this.connection.getRepository(txCtx, AthleteRewardReversal);
                const duplicate =
                    reason === 'REFUND'
                        ? await reversalRepo.findOne({ where: { rewardId, refundId: extra.refundId } })
                        : reason === 'ORDER_CANCELLED'
                          ? await reversalRepo.findOne({ where: { rewardId, reason } })
                          : null;
                if (duplicate) {
                    return { reverted: 0 };
                }
                const points = Math.max(0, Math.min(pointsToRevert(reward), reward.points - reward.revertedPoints));
                if (points <= 0) {
                    return { reverted: 0 };
                }
                const athlete = await this.connection.getRepository(txCtx, Athlete).findOneOrFail({ where: { id: reward.athleteId } });

                const reversal = await reversalRepo.save(
                    new AthleteRewardReversal({
                        rewardId: reward.id,
                        reason,
                        refundId: extra.refundId ?? null,
                        points,
                        debitedPoints: 0,
                        loyaltyTransactionId: null,
                        note: extra.note ?? null,
                        administratorUserId: extra.administratorUserId ?? null,
                    }),
                );
                const { debited, transaction } = await this.loyaltyService.debitPointsUpTo(
                    txCtx,
                    athlete.customerId,
                    points,
                    'ATHLETE_REWARD_REVERSAL',
                    reward.orderId,
                    `Athlete reward reversal (${reason}) for order ${reward.orderCode}`,
                );
                await reversalRepo.update({ id: reversal.id }, { debitedPoints: debited, loyaltyTransactionId: transaction?.id ?? null });

                const revertedPoints = reward.revertedPoints + points;
                await rewardRepo.update(
                    { id: reward.id },
                    {
                        revertedPoints,
                        unrecoveredPoints: reward.unrecoveredPoints + (points - debited),
                        status: rewardStatusFor(reward.points, revertedPoints),
                    },
                );
                Logger.info(`Reverted ${points} athlete reward points (${reason}) for order ${reward.orderCode}`, loggerCtx);
                return { reverted: points };
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                return { reverted: 0 };
            }
            throw err;
        }
    }

    private async loadOrder(ctx: RequestContext, orderId: ID): Promise<Order | undefined> {
        return this.orderService.findOne(ctx, orderId, ['customer', 'lines', 'shippingLines', 'promotions']);
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}
