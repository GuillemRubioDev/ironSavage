/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test-only in-memory stand-in for TransactionalConnection, shared by the
 * athletes specs. Same philosophy as loyalty.service.spec.ts's fake: faithful
 * to exactly the DB guarantees the code relies on — the unique indexes that
 * make grants/reversals idempotent, the conditional balance UPDATE, and
 * transaction rollback — so the specs exercise the real services (including
 * the real LoyaltyService) rather than mocks of them.
 */
import { LoyaltyAccount } from '../loyalty/loyalty-account.entity';
import { LoyaltyTransaction } from '../loyalty/loyalty-transaction.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { AthleteReward } from './athlete-reward.entity';
import { AthleteRewardReversal } from './athlete-reward-reversal.entity';
import { AthleteRewardService } from './athlete-reward.service';

type Row = Record<string, any>;

interface TableDef {
    rows: Row[];
    /** Each entry is a set of columns that must be unique together (rows where any column is null are skipped), optionally filtered. */
    unique: Array<{ columns: string[]; where?: (row: Row) => boolean }>;
}

function uniqueViolation(): Error {
    const err: any = new Error('duplicate key value violates unique constraint');
    err.code = '23505';
    return err;
}

function valueMatches(rowValue: unknown, expected: any): boolean {
    if (expected && typeof expected === 'object' && '_type' in expected) {
        if (expected._type === 'in') return (expected._value as unknown[]).map(String).includes(String(rowValue));
        if (expected._type === 'not') return !valueMatches(rowValue, expected._value);
        if (expected._type === 'isNull') return rowValue === null || rowValue === undefined;
        throw new Error(`Unsupported FindOperator ${expected._type}`);
    }
    if (expected === null) return rowValue === null || rowValue === undefined;
    return String(rowValue) === String(expected);
}

function matches(row: Row, where: Row = {}): boolean {
    return Object.entries(where).every(([k, v]) => valueMatches(row[k], v));
}

export function createFakeDb() {
    const tables = new Map<unknown, TableDef>([
        [LoyaltyAccount, { rows: [], unique: [{ columns: ['customerId'] }] }],
        [LoyaltyTransaction, { rows: [], unique: [{ columns: ['orderId'], where: r => r.type === 'EARN' }] }],
        [Athlete, { rows: [], unique: [{ columns: ['customerId'] }] }],
        [AthleteCode, { rows: [], unique: [{ columns: ['code'] }, { columns: ['promotionId'] }] }],
        [AthleteReward, { rows: [], unique: [{ columns: ['orderId'] }] }],
        [
            AthleteRewardReversal,
            {
                rows: [],
                unique: [
                    { columns: ['rewardId', 'refundId'] },
                    { columns: ['rewardId'], where: r => r.reason === 'ORDER_CANCELLED' },
                ],
            },
        ],
    ]);
    let nextId = 1;

    // Relations the services load, resolved by foreign key.
    const relationResolvers: Record<string, (row: Row) => unknown> = {
        athlete: row => tables.get(Athlete)!.rows.find(a => String(a.id) === String(row.athleteId)),
        codes: row => tables.get(AthleteCode)!.rows.filter(c => String(c.athleteId) === String(row.id)),
        reversals: row => tables.get(AthleteRewardReversal)!.rows.filter(r => String(r.rewardId) === String(row.id)),
    };

    function withRelations(row: Row | undefined, relations?: Row): Row | null {
        if (!row) return null;
        const copy: Row = { ...row };
        for (const key of Object.keys(relations ?? {})) {
            if (relationResolvers[key]) copy[key] = relationResolvers[key](row);
        }
        return copy;
    }

    function checkUnique(table: TableDef, candidate: Row) {
        for (const rule of table.unique) {
            if (rule.where && !rule.where(candidate)) continue;
            if (rule.columns.some(c => candidate[c] === null || candidate[c] === undefined)) continue;
            const clash = table.rows.find(
                r => r.id !== candidate.id && (!rule.where || rule.where(r)) && rule.columns.every(c => String(r[c]) === String(candidate[c])),
            );
            if (clash) throw uniqueViolation();
        }
    }

    function repoFor(Entity: unknown) {
        const table = tables.get(Entity);
        if (!table) throw new Error(`No fake table for ${String((Entity as any)?.name)}`);
        const repo = {
            findOne: async ({ where, relations }: { where: Row; relations?: Row }) =>
                withRelations(table.rows.find(r => matches(r, where)), relations),
            findOneOrFail: async (opts: { where: Row; relations?: Row }) => {
                const found = await repo.findOne(opts);
                if (!found) throw new Error('Entity not found');
                return found;
            },
            find: async ({ where, relations }: { where?: Row; relations?: Row } = {}) =>
                table.rows.filter(r => matches(r, where)).map(r => withRelations(r, relations)!),
            findAndCount: async ({ where, relations, skip = 0, take = 50 }: { where?: Row; relations?: Row; skip?: number; take?: number }) => {
                const all = table.rows.filter(r => matches(r, where)).reverse(); // newest first, like order: createdAt DESC
                return [all.slice(skip, skip + take).map(r => withRelations(r, relations)!), all.length] as const;
            },
            save: async (input: Row) => {
                const existing = input.id !== undefined ? table.rows.find(r => String(r.id) === String(input.id)) : undefined;
                const plain = Object.fromEntries(Object.entries(input).filter(([, v]) => typeof v !== 'function'));
                if (existing) {
                    const merged = { ...existing, ...plain };
                    checkUnique(table, merged);
                    Object.assign(existing, plain);
                    return existing;
                }
                const row = { createdAt: new Date(), ...plain, id: String(nextId++) };
                checkUnique(table, row);
                table.rows.push(row);
                return { ...row };
            },
            update: async (criteria: Row, patch: Row) => {
                for (const row of table.rows.filter(r => matches(r, criteria))) {
                    checkUnique(table, { ...row, ...patch });
                    Object.assign(row, patch);
                }
                return { affected: 1 };
            },
            // Only the conditional balance UPDATE in LoyaltyService.applyBalanceChange uses this.
            createQueryBuilder: () => {
                const params: Row = {};
                const builder = {
                    update: () => builder,
                    set: () => builder,
                    where: (_c: string, p?: Row) => (Object.assign(params, p), builder),
                    andWhere: () => builder,
                    setParameters: (p: Row) => (Object.assign(params, p), builder),
                    execute: async () => {
                        const account = table.rows.find(r => String(r.id) === String(params.id));
                        const delta = params.delta as number;
                        if (!account || account.balance + delta < 0) return { affected: 0 };
                        account.balance += delta;
                        if (delta >= 0) account.lifetimeEarned += params.lifetimeDelta;
                        else account.lifetimeSpent += params.lifetimeDelta;
                        return { affected: 1 };
                    },
                };
                return builder;
            },
        };
        return repo;
    }

    // Serialized transactions with snapshot/rollback, like loyalty.service.spec.ts.
    let mutex: Promise<unknown> = Promise.resolve();
    const connection = {
        getRepository: (_ctx: unknown, Entity: unknown) => repoFor(Entity),
        withTransaction: async (ctx: unknown, work: (ctx: unknown) => Promise<unknown>) => {
            const run = async () => {
                const snapshot = new Map([...tables].map(([k, t]) => [k, t.rows.map(r => ({ ...r }))]));
                try {
                    return await work(ctx);
                } catch (err) {
                    for (const [k, rows] of snapshot) {
                        const t = tables.get(k)!;
                        t.rows.length = 0;
                        t.rows.push(...rows);
                    }
                    throw err;
                }
            };
            const result = mutex.then(run, run);
            mutex = result.catch(() => undefined);
            return result;
        },
    };

    function rows(Entity: unknown): Row[] {
        return tables.get(Entity)!.rows;
    }

    return { connection, rows };
}

export type FakeDb = ReturnType<typeof createFakeDb>;

/** Builds the real LoyaltyService + AthleteRewardService on top of one fake DB. */
export function createRewardServices(db: FakeDb = createFakeDb()) {
    const surcharges: Row[] = [];
    const orderService = {
        addSurchargeToOrder: async (_ctx: unknown, _orderId: unknown, input: Row) => {
            surcharges.push({ id: String(surcharges.length + 1), ...input });
            return {};
        },
        removeSurchargeFromOrder: async () => ({}),
        findOne: async () => undefined,
    };
    const loyaltyService = new LoyaltyService(db.connection as any, orderService as any);
    const rewardService = new AthleteRewardService(db.connection as any, orderService as any, loyaltyService);
    return { db, loyaltyService, rewardService, surcharges };
}

/** Inserts an athlete (+ code) directly, as AthleteService would after creating the Promotion. */
export async function seedAthlete(
    db: FakeDb,
    input: { customerId: string; code: string; promotionId: string; discountValue?: number; rewardValue?: number; rewardType?: string; enabled?: boolean },
) {
    const athlete = await db.connection.getRepository({}, Athlete).save({ customerId: input.customerId, enabled: input.enabled ?? true, notes: null });
    const code = await db.connection.getRepository({}, AthleteCode).save({
        athleteId: athlete.id,
        code: input.code,
        enabled: true,
        discountType: 'PERCENTAGE',
        discountValue: input.discountValue ?? 10,
        rewardType: input.rewardType ?? 'PERCENTAGE',
        rewardValue: input.rewardValue ?? 5,
        promotionId: input.promotionId,
    });
    return { athlete, code };
}

/**
 * A settled order as AthleteRewardService loads it. `promotionIds` are the
 * promotions Vendure actually applied; the discount lines mimic what
 * order_percentage_discount produces.
 */
export function makeOrder(input: {
    id: string;
    customerId: string;
    subTotalWithTax: number;
    totalWithTax?: number;
    couponCodes?: string[];
    promotionIds?: string[];
    discountWithTax?: number;
}) {
    return {
        id: input.id,
        code: `ORDER${input.id}`,
        customerId: input.customerId,
        couponCodes: input.couponCodes ?? [],
        subTotalWithTax: input.subTotalWithTax,
        totalWithTax: input.totalWithTax ?? input.subTotalWithTax,
        currencyCode: 'EUR',
        promotions: (input.promotionIds ?? []).map(id => ({ id })),
        discounts: (input.promotionIds ?? []).map(id => ({ adjustmentSource: `PROMOTION:${id}`, amountWithTax: -(input.discountWithTax ?? 0) })),
    } as any;
}
