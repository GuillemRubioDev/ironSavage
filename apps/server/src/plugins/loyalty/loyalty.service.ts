import { Injectable } from '@nestjs/common';
import { ID, Logger, Order, OrderService, PaginatedList, Refund, RequestContext, TransactionalConnection } from '@vendure/core';

import { loggerCtx, LoyaltyTransactionType } from './constants';
import { getLoyaltyConfig } from './loyalty-config';
import { LoyaltyAccount } from './loyalty-account.entity';
import { LoyaltyTransaction } from './loyalty-transaction.entity';

/** Sku used to tag the Surcharge that represents an active points redemption, so it can be found again to cancel/remove it. */
export const LOYALTY_SURCHARGE_SKU = 'LOYALTY_POINTS_DISCOUNT';

type BalanceChangeResult =
    | { success: true; transaction: LoyaltyTransaction; balance: number }
    | { success: false };

export type RedeemPointsResult =
    | { success: true; discountCents: number; balance: number }
    | { success: false; reason: 'BELOW_MINIMUM' | 'NO_CUSTOMER' | 'ALREADY_REDEEMED' | 'EXCEEDS_MAX_DISCOUNT' | 'EXCEEDS_ORDER_TOTAL' | 'INSUFFICIENT_BALANCE' };

@Injectable()
export class LoyaltyService {
    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
    ) {}

    async getAccountForCustomer(ctx: RequestContext, customerId: ID): Promise<LoyaltyAccount | null> {
        const account = await this.connection.getRepository(ctx, LoyaltyAccount).findOne({ where: { customerId } });
        return account ?? null;
    }

    async getBalance(ctx: RequestContext, customerId: ID): Promise<number> {
        const account = await this.getAccountForCustomer(ctx, customerId);
        return account?.balance ?? 0;
    }

    async getHistory(
        ctx: RequestContext,
        customerId: ID,
        options?: { skip?: number; take?: number },
    ): Promise<PaginatedList<LoyaltyTransaction>> {
        const account = await this.getAccountForCustomer(ctx, customerId);
        if (!account) {
            return { items: [], totalItems: 0 };
        }
        const [items, totalItems] = await this.connection.getRepository(ctx, LoyaltyTransaction).findAndCount({
            where: { accountId: account.id },
            order: { createdAt: 'DESC' },
            skip: options?.skip ?? 0,
            take: options?.take ?? 50,
        });
        return { items, totalItems };
    }

    /**
     * Called when an Order transitions to PaymentSettled. Idempotent: the
     * partial unique index on (orderId) WHERE type='EARN' means a duplicate
     * event for the same order is rejected at the DB level and safely
     * ignored here, rather than double-crediting points.
     */
    async earnForOrder(ctx: RequestContext, order: Order): Promise<{ processed: boolean; points?: number }> {
        const customerId = order.customerId;
        if (!customerId) {
            Logger.warn(`Order ${order.code} has no customer; skipping loyalty EARN`, loggerCtx);
            return { processed: false };
        }

        const points = this.calculateEarnedPoints(order);
        if (points <= 0) {
            return { processed: false };
        }

        try {
            return await this.connection.withTransaction(ctx, async txCtx => {
                // Checked up front (not just relied on via the unique index below) so
                // a duplicate event never even touches the balance in the common,
                // non-racing case — the index is a last-resort safety net for the
                // genuinely concurrent case, where the loser's whole transaction
                // (including the balance credit) is rolled back by the DB.
                const alreadyEarned = await this.connection
                    .getRepository(txCtx, LoyaltyTransaction)
                    .findOne({ where: { orderId: order.id, type: 'EARN' } });
                if (alreadyEarned) {
                    return { processed: false };
                }

                const account = await this.getOrCreateAccount(txCtx, customerId);
                await this.credit(txCtx, account.id, points, 'EARN', order.id, `Order ${order.code}`);
                Logger.info(`Earned ${points} loyalty points for order ${order.code}`, loggerCtx);
                return { processed: true, points };
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                Logger.info(`Order ${order.code} already earned loyalty points (duplicate event)`, loggerCtx);
                return { processed: false };
            }
            throw err;
        }
    }

    /**
     * Customer-initiated redemption during checkout. Synchronous by design —
     * "the customer must decide to use them" means the discount is applied
     * the moment they ask for it, not deferred to payment confirmation. The
     * tradeoff is an abandoned/never-paid order can leave points spent; the
     * order-Cancelled subscriber in the plugin and `cancelRedemption` below
     * both exist specifically to compensate for that case.
     */
    async redeemPoints(ctx: RequestContext, order: Order, points: number): Promise<RedeemPointsResult> {
        const config = getLoyaltyConfig();
        if (!Number.isInteger(points) || points < config.minRedeemablePoints) {
            return { success: false, reason: 'BELOW_MINIMUM' };
        }
        const customerId = order.customerId;
        if (!customerId) {
            return { success: false, reason: 'NO_CUSTOMER' };
        }

        const activeRedemption = await this.getActiveRedemptionPoints(ctx, order.id);
        if (activeRedemption > 0) {
            return { success: false, reason: 'ALREADY_REDEEMED' };
        }

        const discountCents = points * config.pointValueInCents;
        if (discountCents > config.maxDiscountPerOrderCents) {
            return { success: false, reason: 'EXCEEDS_MAX_DISCOUNT' };
        }
        if (discountCents >= order.totalWithTax) {
            return { success: false, reason: 'EXCEEDS_ORDER_TOTAL' };
        }

        return this.connection.withTransaction(ctx, async txCtx => {
            const account = await this.getOrCreateAccount(txCtx, customerId);
            const result = await this.debit(
                txCtx,
                account.id,
                points,
                'SPEND',
                order.id,
                `Redeemed ${points} points on order ${order.code}`,
            );
            if (!result.success) {
                return { success: false, reason: 'INSUFFICIENT_BALANCE' };
            }
            await this.orderService.addSurchargeToOrder(txCtx, order.id, {
                description: `Descuento por puntos de fidelización (${points} pts)`,
                listPrice: -discountCents,
                sku: LOYALTY_SURCHARGE_SKU,
            });
            Logger.info(`Redeemed ${points} loyalty points on order ${order.code}`, loggerCtx);
            return { success: true, discountCents, balance: result.balance };
        });
    }

    /**
     * Reverses an active (un-reverted) redemption on an order: restores the
     * points and removes the discount Surcharge. Used both for the explicit
     * "change my mind" mutation and automatically when an order is cancelled.
     */
    async cancelRedemption(ctx: RequestContext, order: Order): Promise<{ success: boolean; pointsRestored?: number }> {
        const activePoints = await this.getActiveRedemptionPoints(ctx, order.id);
        if (activePoints <= 0) {
            return { success: false };
        }
        const customerId = order.customerId;
        if (!customerId) {
            return { success: false };
        }

        return this.connection.withTransaction(ctx, async txCtx => {
            const account = await this.getOrCreateAccount(txCtx, customerId);
            await this.credit(
                txCtx,
                account.id,
                activePoints,
                'ADJUSTMENT',
                order.id,
                `Revert redemption for order ${order.code}`,
            );
            const surcharges = (order.surcharges ?? []).filter(s => s.sku === LOYALTY_SURCHARGE_SKU);
            for (const surcharge of surcharges) {
                await this.orderService.removeSurchargeFromOrder(txCtx, order.id, surcharge.id);
            }
            Logger.info(`Reverted ${activePoints} loyalty points on order ${order.code}`, loggerCtx);
            return { success: true, pointsRestored: activePoints };
        });
    }

    /**
     * Reverts points earned on an order, proportionally to how much of the
     * order was refunded (capped so a sequence of partial refunds can never
     * revert more than was originally earned, and capped again at the
     * account's current balance so a balance can never go negative even if
     * the customer already spent those points elsewhere).
     */
    async revertForRefund(ctx: RequestContext, order: Order, refund: Refund): Promise<{ reverted: number }> {
        return this.connection.withTransaction(ctx, async txCtx => {
            const txRepo = this.connection.getRepository(txCtx, LoyaltyTransaction);
            const earnTx = await txRepo.findOne({ where: { orderId: order.id, type: 'EARN' } });
            if (!earnTx || earnTx.points <= 0) {
                return { reverted: 0 };
            }

            const priorReverts = await txRepo.find({ where: { orderId: order.id, type: 'REFUND' } });
            const alreadyReverted = priorReverts.reduce((sum, t) => sum + Math.abs(t.points), 0);
            const remaining = earnTx.points - alreadyReverted;
            if (remaining <= 0) {
                return { reverted: 0 };
            }

            const proportion = order.totalWithTax > 0 ? Math.min(1, refund.total / order.totalWithTax) : 1;
            let pointsToRevert = Math.min(remaining, Math.round(earnTx.points * proportion));
            if (pointsToRevert <= 0) {
                return { reverted: 0 };
            }

            const customerId = order.customerId;
            if (!customerId) {
                return { reverted: 0 };
            }
            const account = await this.getOrCreateAccount(txCtx, customerId);
            // Never push balance negative, even if it means reverting fewer points
            // than the refund proportion would strictly justify — the ledger stays
            // consistent and the store absorbs the (rare) shortfall.
            pointsToRevert = Math.min(pointsToRevert, account.balance);
            if (pointsToRevert <= 0) {
                return { reverted: 0 };
            }

            await this.debit(txCtx, account.id, pointsToRevert, 'REFUND', order.id, `Refund on order ${order.code}`);
            Logger.info(`Reverted ${pointsToRevert} loyalty points for a refund on order ${order.code}`, loggerCtx);
            return { reverted: pointsToRevert };
        });
    }

    /** Admin-initiated manual balance correction. `points` may be negative. */
    async adjustBalance(ctx: RequestContext, customerId: ID, points: number, description: string): Promise<LoyaltyTransaction> {
        if (!Number.isInteger(points) || points === 0) {
            throw new Error('Adjustment points must be a non-zero integer');
        }
        return this.connection.withTransaction(ctx, async txCtx => {
            const account = await this.getOrCreateAccount(txCtx, customerId);
            const result =
                points > 0
                    ? await this.credit(txCtx, account.id, points, 'ADJUSTMENT', undefined, description)
                    : await this.debit(txCtx, account.id, -points, 'ADJUSTMENT', undefined, description);
            if (!result.success) {
                throw new Error('Insufficient balance for this adjustment');
            }
            return result.transaction;
        });
    }

    private calculateEarnedPoints(order: Order): number {
        const config = getLoyaltyConfig();
        const euros = order.totalWithTax / 100;
        return Math.floor(euros * config.pointsPerEuro);
    }

    /** Net of SPEND/ADJUSTMENT points for an order; a negative net means there's an un-reverted redemption of that magnitude. */
    private async getActiveRedemptionPoints(ctx: RequestContext, orderId: ID): Promise<number> {
        const txs = await this.connection.getRepository(ctx, LoyaltyTransaction).find({ where: { orderId } });
        const net = txs
            .filter(t => t.type === 'SPEND' || t.type === 'ADJUSTMENT')
            .reduce((sum, t) => sum + t.points, 0);
        return net < 0 ? -net : 0;
    }

    private async getOrCreateAccount(ctx: RequestContext, customerId: ID): Promise<LoyaltyAccount> {
        const repo = this.connection.getRepository(ctx, LoyaltyAccount);
        const existing = await repo.findOne({ where: { customerId } });
        if (existing) {
            return existing;
        }
        try {
            return await repo.save(new LoyaltyAccount({ customerId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 }));
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                // Lost a race against a concurrent first-time account creation for
                // the same customer — the other insert won, just read it back.
                return repo.findOneOrFail({ where: { customerId } });
            }
            throw err;
        }
    }

    private async credit(
        ctx: RequestContext,
        accountId: ID,
        points: number,
        type: LoyaltyTransactionType,
        orderId: ID | undefined,
        description: string,
    ): Promise<BalanceChangeResult> {
        return this.applyBalanceChange(ctx, accountId, points, type, orderId, description);
    }

    private async debit(
        ctx: RequestContext,
        accountId: ID,
        points: number,
        type: LoyaltyTransactionType,
        orderId: ID | undefined,
        description: string,
    ): Promise<BalanceChangeResult> {
        return this.applyBalanceChange(ctx, accountId, -points, type, orderId, description);
    }

    /**
     * Atomically applies a signed balance delta with a single conditional
     * UPDATE (`WHERE balance + delta >= 0`), so a debit that would push the
     * balance negative fails cleanly instead of relying on a
     * read-then-write that could race with a concurrent redemption. Only on
     * success is the ledger row inserted, keeping `LoyaltyAccount.balance`
     * and the `LoyaltyTransaction` audit trail consistent within one DB
     * transaction.
     */
    private async applyBalanceChange(
        ctx: RequestContext,
        accountId: ID,
        delta: number,
        type: LoyaltyTransactionType,
        orderId: ID | undefined,
        description: string,
    ): Promise<BalanceChangeResult> {
        const accountRepo = this.connection.getRepository(ctx, LoyaltyAccount);
        const lifetimeField = delta >= 0 ? 'lifetimeEarned' : 'lifetimeSpent';
        const lifetimeDelta = Math.abs(delta);

        const updateResult = await accountRepo
            .createQueryBuilder()
            .update(LoyaltyAccount)
            .set({
                balance: () => '"balance" + :delta',
                [lifetimeField]: () => `"${lifetimeField}" + :lifetimeDelta`,
            })
            .where('id = :id', { id: accountId })
            .andWhere('"balance" + :delta >= 0')
            .setParameters({ delta, lifetimeDelta, id: accountId })
            .execute();

        if (!updateResult.affected) {
            return { success: false };
        }

        const txRepo = this.connection.getRepository(ctx, LoyaltyTransaction);
        const transaction = await txRepo.save(new LoyaltyTransaction({ accountId, type, points: delta, orderId, description }));
        const updatedAccount = await accountRepo.findOneOrFail({ where: { id: accountId } });
        return { success: true, transaction, balance: updatedAccount.balance };
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}
