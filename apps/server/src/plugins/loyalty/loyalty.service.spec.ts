import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { LoyaltyService } = require('./loyalty.service');
const { LoyaltyAccount } = require('./loyalty-account.entity');
const { LoyaltyTransaction } = require('./loyalty-transaction.entity');
const { setLoyaltyConfig } = require('./loyalty-config');

setLoyaltyConfig({ pointsPerEuro: 1, pointValueInCents: 1, minRedeemablePoints: 100, maxDiscountPerOrderCents: 2000 });

/**
 * Sustitutos mínimos en memoria de los dos repositorios, fieles a la condición que
 * impone el UPDATE atómico real (`balance + delta >= 0`), para que estos tests
 * prueben la misma seguridad ante carreras que el SQL de producción, y a la
 * restricción única de EARN por pedido que da el índice parcial real.
 */
function createFakeDb() {
    const accounts = new Map<string, any>();
    const transactions: any[] = [];
    let nextAccountId = 1;
    let nextTxId = 1;

    function matches(row: any, where: Record<string, unknown>): boolean {
        return Object.entries(where).every(([k, v]) => String(row[k]) === String(v));
    }

    const accountRepo = {
        findOne: async ({ where }: { where: Record<string, unknown> }) => {
            for (const account of accounts.values()) {
                if (matches(account, where)) return account;
            }
            return null;
        },
        findOneOrFail: async (opts: { where: Record<string, unknown> }) => {
            const found = await accountRepo.findOne(opts);
            if (!found) throw new Error('LoyaltyAccount not found');
            return found;
        },
        save: async (input: any) => {
            for (const account of accounts.values()) {
                if (String(account.customerId) === String(input.customerId)) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
            }
            const account = {
                id: String(nextAccountId++),
                customerId: input.customerId,
                balance: input.balance ?? 0,
                lifetimeEarned: input.lifetimeEarned ?? 0,
                lifetimeSpent: input.lifetimeSpent ?? 0,
            };
            accounts.set(account.id, account);
            return account;
        },
        createQueryBuilder: () => {
            const params: Record<string, unknown> = {};
            const builder = {
                update: () => builder,
                set: () => builder,
                where: (_cond: string, whereParams?: Record<string, unknown>) => {
                    Object.assign(params, whereParams);
                    return builder;
                },
                andWhere: () => builder,
                setParameters: (p: Record<string, unknown>) => {
                    Object.assign(params, p);
                    return builder;
                },
                execute: async () => {
                    const account = accounts.get(String(params.id));
                    const delta = params.delta as number;
                    if (!account || account.balance + delta < 0) {
                        return { affected: 0 };
                    }
                    account.balance += delta;
                    if (delta >= 0) account.lifetimeEarned += params.lifetimeDelta as number;
                    else account.lifetimeSpent += params.lifetimeDelta as number;
                    return { affected: 1 };
                },
            };
            return builder;
        },
    };

    const transactionRepo = {
        find: async ({ where }: { where: Record<string, unknown> }) => transactions.filter(t => matches(t, where)),
        findOne: async ({ where }: { where: Record<string, unknown> }) => transactions.find(t => matches(t, where)) ?? null,
        findAndCount: async ({ where, skip = 0, take = 50 }: { where: Record<string, unknown>; skip?: number; take?: number }) => {
            const all = transactions.filter(t => matches(t, where));
            return [all.slice(skip, skip + take), all.length] as const;
        },
        save: async (input: any) => {
            if (input.type === 'EARN') {
                const duplicate = transactions.find(t => t.type === 'EARN' && String(t.orderId) === String(input.orderId));
                if (duplicate) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
            }
            const tx = { id: String(nextTxId++), createdAt: new Date(), ...input };
            transactions.push(tx);
            return tx;
        },
    };

    return { accounts, transactions, accountRepo, transactionRepo };
}

function createService() {
    const db = createFakeDb();
    // Una transacción real de Postgres que actualiza la fila de LoyaltyAccount la
    // bloquea, así que una segunda transacción simultánea sobre la misma cuenta espera
    // a que la primera confirme o deshaga: no ve escrituras a medias. `mutex` da al
    // sustituto la misma serialización, y cada turno guarda una copia y la restaura si
    // falla, igual que una transacción real en lo único que este sustituto debe
    // demostrar: que una carrera perdida se deshace entera, no a medias.
    let mutex: Promise<unknown> = Promise.resolve();
    const connectionMock = {
        getRepository: (_ctx: unknown, Entity: unknown) => (Entity === LoyaltyAccount ? db.accountRepo : db.transactionRepo),
        withTransaction: async (ctx: unknown, work: (ctx: unknown) => Promise<unknown>) => {
            const run = async () => {
                const accountsSnapshot = new Map([...db.accounts].map(([k, v]) => [k, { ...v }]));
                const transactionsSnapshot = db.transactions.map(t => ({ ...t }));
                try {
                    return await work(ctx);
                } catch (err) {
                    db.accounts.clear();
                    for (const [k, v] of accountsSnapshot) db.accounts.set(k, v);
                    db.transactions.length = 0;
                    db.transactions.push(...transactionsSnapshot);
                    throw err;
                }
            };
            const result = mutex.then(run, run);
            mutex = result.catch(() => undefined);
            return result;
        },
    };
    const surcharges: any[] = [];
    const addSurchargeToOrder = mock.fn(async (_ctx: unknown, _orderId: unknown, input: any) => {
        surcharges.push({ id: String(surcharges.length + 1), ...input });
        return {};
    });
    const removeSurchargeFromOrder = mock.fn(async (_ctx: unknown, _orderId: unknown, surchargeId: string) => {
        const idx = surcharges.findIndex(s => s.id === surchargeId);
        if (idx >= 0) surcharges.splice(idx, 1);
        return {};
    });
    const orderServiceMock = { addSurchargeToOrder, removeSurchargeFromOrder };

    const service = new LoyaltyService(connectionMock, orderServiceMock);
    return { service, db, surcharges, orderServiceMock };
}

test('a settled order earns points once', async () => {
    const { service, db } = createService();
    const order = { id: '1', code: 'ORDER001', customerId: 'cust-1', totalWithTax: 2599 }; // 25,99 € -> 25 puntos

    const result = await service.earnForOrder({}, order);

    assert.equal(result.processed, true);
    assert.equal(result.points, 25);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-1' } });
    assert.equal(account.balance, 25);
});

test('earning points for the same order twice does not duplicate the credit', async () => {
    const { service, db } = createService();
    const order = { id: '2', code: 'ORDER002', customerId: 'cust-2', totalWithTax: 1000 }; // 10 puntos

    const first = await service.earnForOrder({}, order);
    const second = await service.earnForOrder({}, order);

    assert.equal(first.processed, true);
    assert.equal(second.processed, false);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-2' } });
    assert.equal(account.balance, 10);
});

test('redeeming points applies a discount surcharge and debits the ledger', async () => {
    const { service, db, surcharges } = createService();
    const earnOrder = { id: '3', code: 'ORDER003', customerId: 'cust-3', totalWithTax: 20000 }; // 200 puntos
    await service.earnForOrder({}, earnOrder);
    const checkoutOrder = { id: '4', code: 'ORDER004', customerId: 'cust-3', totalWithTax: 5000, surcharges: [] };

    const result = await service.redeemPoints({}, checkoutOrder, 100);

    assert.equal(result.success, true);
    assert.equal(result.discountCents, 100);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-3' } });
    assert.equal(account.balance, 100); // 200 ganados - 100 gastados
    assert.equal(surcharges.length, 1);
    assert.equal(surcharges[0].listPrice, -100);
});

test('redeeming more points than the balance is rejected, with no side effects', async () => {
    const { service, db, surcharges, orderServiceMock } = createService();
    const earnOrder = { id: '5', code: 'ORDER005', customerId: 'cust-4', totalWithTax: 10000 }; // 100 puntos
    await service.earnForOrder({}, earnOrder);
    const checkoutOrder = { id: '6', code: 'ORDER006', customerId: 'cust-4', totalWithTax: 99999, surcharges: [] };

    const result = await service.redeemPoints({}, checkoutOrder, 500);

    assert.equal(result.success, false);
    assert.equal(result.reason, 'INSUFFICIENT_BALANCE');
    assert.equal(surcharges.length, 0);
    assert.equal(orderServiceMock.addSurchargeToOrder.mock.callCount(), 0);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-4' } });
    assert.equal(account.balance, 100); // sin cambios
});

test('a settled refund reverts a proportional, capped share of the earned points', async () => {
    const { service, db } = createService();
    const order = { id: '7', code: 'ORDER007', customerId: 'cust-5', totalWithTax: 10000 }; // 100 puntos ganados
    await service.earnForOrder({}, order);
    const refund = { total: 5000 }; // reembolsado el 50 %

    const result = await service.revertForRefund({}, order, refund);

    assert.equal(result.reverted, 50);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-5' } });
    assert.equal(account.balance, 50);
});

test('concurrent EARN attempts for the same order only credit points once', async () => {
    const { service, db } = createService();
    const order = { id: '8', code: 'ORDER008', customerId: 'cust-6', totalWithTax: 10000 }; // 100 puntos

    const [r1, r2] = await Promise.all([service.earnForOrder({}, order), service.earnForOrder({}, order)]);

    const processedCount = [r1, r2].filter(r => r.processed).length;
    assert.equal(processedCount, 1);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-6' } });
    assert.equal(account.balance, 100);
});

test('an earn policy can exclude an order from regular EARN without affecting other customers', async () => {
    const { service, db } = createService();
    // Imita la política de AthletesPlugin: este cliente es atleta.
    service.registerEarnPolicy({ name: 'test-athletes', canEarnForOrder: async (_ctx: unknown, order: any) => order.customerId !== 'athlete-1' });

    const athleteResult = await service.earnForOrder({}, { id: '9', code: 'ORDER009', customerId: 'athlete-1', totalWithTax: 10000 });
    const customerResult = await service.earnForOrder({}, { id: '10', code: 'ORDER010', customerId: 'cust-7', totalWithTax: 10000 });

    assert.equal(athleteResult.processed, false);
    assert.equal(await db.accountRepo.findOne({ where: { customerId: 'athlete-1' } }), null);
    assert.equal(customerResult.processed, true);
    assert.equal(customerResult.points, 100, 'normal customers still earn exactly as before');
});

test('debitPointsUpTo never debits more than the current balance', async () => {
    const { service, db } = createService();
    await service.creditPoints({}, 'cust-8', 120, 'ATHLETE_REWARD', '11', 'reward');

    const result = await service.debitPointsUpTo({}, 'cust-8', 500, 'ATHLETE_REWARD_REVERSAL', '11', 'reversal');

    assert.equal(result.debited, 120);
    const account = await db.accountRepo.findOne({ where: { customerId: 'cust-8' } });
    assert.equal(account.balance, 0);
});
