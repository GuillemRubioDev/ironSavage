import { Injectable } from '@nestjs/common';
import { ID, Logger, Order, OrderService, PaginatedList, Refund, RequestContext, TransactionalConnection } from '@vendure/core';

import { loggerCtx, LoyaltyTransactionType } from './constants';
import { getLoyaltyConfig } from './loyalty-config';
import { LoyaltyAccount } from './loyalty-account.entity';
import { LoyaltyTransaction } from './loyalty-transaction.entity';
import type { LoyaltyEarnPolicy } from './types';

/** Sku que marca el recargo (Surcharge) de un canje de puntos activo, para encontrarlo después y anularlo o quitarlo. */
export const LOYALTY_SURCHARGE_SKU = 'LOYALTY_POINTS_DISCOUNT';

type BalanceChangeResult =
    | { success: true; transaction: LoyaltyTransaction; balance: number }
    | { success: false };

export type RedeemPointsResult =
    | { success: true; discountCents: number; balance: number }
    | { success: false; reason: 'BELOW_MINIMUM' | 'NO_CUSTOMER' | 'ALREADY_REDEEMED' | 'EXCEEDS_MAX_DISCOUNT' | 'EXCEEDS_ORDER_TOTAL' | 'INSUFFICIENT_BALANCE' };

@Injectable()
export class LoyaltyService {
    private earnPolicies: LoyaltyEarnPolicy[] = [];

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
    ) {}

    /** Ver LoyaltyEarnPolicy. Lo llaman otros plugins al arrancar. */
    registerEarnPolicy(policy: LoyaltyEarnPolicy): void {
        this.earnPolicies.push(policy);
    }

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
     * Se llama cuando un pedido pasa a PaymentSettled. Idempotente: el índice único
     * parcial sobre (orderId) WHERE type='EARN' hace que un evento duplicado del mismo
     * pedido se rechace en la base de datos y aquí se ignore sin problema, en vez de
     * abonar los puntos dos veces.
     */
    async earnForOrder(ctx: RequestContext, order: Order): Promise<{ processed: boolean; points?: number }> {
        const customerId = order.customerId;
        if (!customerId) {
            Logger.warn(`Order ${order.code} has no customer; skipping loyalty EARN`, loggerCtx);
            return { processed: false };
        }

        for (const policy of this.earnPolicies) {
            if (!(await policy.canEarnForOrder(ctx, order))) {
                Logger.info(`Order ${order.code} is excluded from loyalty EARN by policy "${policy.name}"`, loggerCtx);
                return { processed: false };
            }
        }

        const points = this.calculateEarnedPoints(order);
        if (points <= 0) {
            return { processed: false };
        }

        try {
            return await this.connection.withTransaction(ctx, async txCtx => {
                // Se comprueba antes (no solo con el índice único de abajo) para que, en el
                // caso normal sin carreras, un evento duplicado ni toque el saldo. El índice
                // es la última red de seguridad para el caso realmente simultáneo, en el que
                // la base de datos deshace toda la transacción perdedora (abono incluido).
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
     * Canje que inicia el cliente durante el checkout. Síncrono a propósito: «el
     * cliente debe decidir usarlos» significa que el descuento se aplica en cuanto lo
     * pide, no al confirmarse el pago. La contrapartida es que un pedido abandonado o
     * sin pagar puede dejar puntos gastados; el suscriptor de pedido cancelado del
     * plugin y `cancelRedemption` existen justamente para compensar ese caso.
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
     * Deshace un canje activo (no revertido) de un pedido: devuelve los puntos y quita
     * el recargo de descuento. Se usa en la mutación de «he cambiado de idea» y,
     * automáticamente, al cancelarse un pedido.
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
     * Revierte los puntos ganados con un pedido en proporción a lo reembolsado (con
     * tope para que varios reembolsos parciales nunca reviertan más de lo ganado, y
     * otro tope en el saldo actual para que nunca sea negativo aunque el cliente ya
     * haya gastado esos puntos).
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
            // Nunca dejar el saldo en negativo, aunque eso suponga revertir menos puntos
            // de los que tocarían por la proporción: el libro sigue coherente y la tienda
            // asume la diferencia (poco habitual).
            pointsToRevert = Math.min(pointsToRevert, account.balance);
            if (pointsToRevert <= 0) {
                return { reverted: 0 };
            }

            await this.debit(txCtx, account.id, pointsToRevert, 'REFUND', order.id, `Refund on order ${order.code}`);
            Logger.info(`Reverted ${pointsToRevert} loyalty points for a refund on order ${order.code}`, loggerCtx);
            return { reverted: pointsToRevert };
        });
    }

    /** Corrección manual del saldo por un administrador. `points` puede ser negativo. */
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

    /**
     * Abona puntos a la cuenta de un cliente con cualquier tipo de movimiento, para
     * otros plugins que dan puntos con sus propias reglas (p. ej. ATHLETE_REWARD).
     * Usa la transacción de quien llama si `ctx` la lleva, para que sus registros y
     * esta fila del libro sean atómicos.
     */
    async creditPoints(
        ctx: RequestContext,
        customerId: ID,
        points: number,
        type: LoyaltyTransactionType,
        orderId: ID | undefined,
        description: string,
    ): Promise<LoyaltyTransaction> {
        if (!Number.isInteger(points) || points <= 0) {
            throw new Error('Credited points must be a positive integer');
        }
        const account = await this.getOrCreateAccount(ctx, customerId);
        const result = await this.credit(ctx, account.id, points, type, orderId, description);
        if (!result.success) {
            throw new Error(`Failed to credit ${points} points to customer ${customerId}`);
        }
        return result.transaction;
    }

    /**
     * Descuenta hasta `points` de la cuenta de un cliente, nunca más que el saldo
     * actual, con la misma regla que `revertForRefund` («el saldo nunca es negativo,
     * la tienda asume la diferencia»). Primero bloquea la fila de la cuenta para que
     * un canje simultáneo no se cuele entre la lectura del saldo y el UPDATE
     * condicional. Debe ejecutarse dentro de una transacción.
     */
    async debitPointsUpTo(
        ctx: RequestContext,
        customerId: ID,
        points: number,
        type: LoyaltyTransactionType,
        orderId: ID | undefined,
        description: string,
    ): Promise<{ debited: number; transaction?: LoyaltyTransaction }> {
        if (!Number.isInteger(points) || points <= 0) {
            return { debited: 0 };
        }
        const account = await this.getOrCreateAccount(ctx, customerId);
        const locked = await this.connection
            .getRepository(ctx, LoyaltyAccount)
            .findOne({ where: { id: account.id }, lock: { mode: 'pessimistic_write' } });
        const toDebit = Math.min(points, locked?.balance ?? 0);
        if (toDebit <= 0) {
            return { debited: 0 };
        }
        const result = await this.debit(ctx, account.id, toDebit, type, orderId, description);
        if (!result.success) {
            return { debited: 0 };
        }
        return { debited: toDebit, transaction: result.transaction };
    }

    private calculateEarnedPoints(order: Order): number {
        const config = getLoyaltyConfig();
        const euros = order.totalWithTax / 100;
        return Math.floor(euros * config.pointsPerEuro);
    }

    /** Neto de puntos SPEND/ADJUSTMENT de un pedido; si es negativo, hay un canje no revertido de esa cantidad. */
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
                // Otra creación simultánea de la cuenta del mismo cliente ganó la carrera:
                // basta con volver a leerla.
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
     * Aplica de forma atómica una variación de saldo con signo mediante un único
     * UPDATE condicional (`WHERE balance + delta >= 0`): un cargo que dejaría el saldo
     * en negativo falla limpiamente, sin depender de leer y luego escribir (que podría
     * chocar con un canje simultáneo). Solo si tiene éxito se inserta la fila del
     * libro, así `LoyaltyAccount.balance` y `LoyaltyTransaction` quedan coherentes en
     * una misma transacción.
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
