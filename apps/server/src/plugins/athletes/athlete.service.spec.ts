import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { Customer, Promotion, orderPercentageDiscount, orderFixedDiscount } = require('@vendure/core');
const { AthleteService } = require('./athlete.service');
const { Athlete } = require('./athlete.entity');
const { AthleteCode } = require('./athlete-code.entity');
const { createFakeDb } = require('./athletes.test-utils');

const ctx = {};

/**
 * AthleteService on the shared fake DB, plus fakes for the two core
 * repositories it touches (Customer, Promotion) and a PromotionService mock
 * that records exactly what would be written to Vendure's promotion table.
 */
function createService(existingPromotions: Array<{ id: string; couponCode: string; deletedAt?: Date | null }> = []) {
    const db = createFakeDb();
    const customers = [
        { id: 'pedro', firstName: 'Pedro', lastName: 'Rodríguez', emailAddress: 'pedro@example.com', deletedAt: null },
        { id: 'ana', firstName: 'Ana', lastName: 'López', emailAddress: 'ana@example.com', deletedAt: null },
    ];
    const promotions = existingPromotions.map(p => ({ deletedAt: null, ...p }));
    const customerRepo = {
        findOne: async ({ where }: any) => customers.find(c => c.id === where.id || c.emailAddress === where.emailAddress) ?? null,
    };
    const promotionRepo = {
        findOne: async ({ where }: any) => promotions.find(p => p.id === where.id && !p.deletedAt) ?? null,
        createQueryBuilder: () => {
            const params: any = {};
            const qb = {
                where: (_: string, p: any) => (Object.assign(params, p), qb),
                andWhere: (_: string, p?: any) => (Object.assign(params, p ?? {}), qb),
                getCount: async () =>
                    promotions.filter(
                        p => !p.deletedAt && p.couponCode.toLowerCase() === params.code.toLowerCase() && p.id !== params.ownId,
                    ).length,
            };
            return qb;
        },
    };
    const connection = {
        ...db.connection,
        getRepository: (c: unknown, Entity: unknown) =>
            Entity === Customer ? customerRepo : Entity === Promotion ? promotionRepo : db.connection.getRepository(c, Entity),
    };
    let nextPromotionId = 1000;
    const createPromotion = mock.fn(async (_ctx: unknown, input: any) => {
        const promo = { id: String(nextPromotionId++), couponCode: input.couponCode, deletedAt: null, input };
        promotions.push(promo);
        return promo;
    });
    const updatePromotion = mock.fn(async (_ctx: unknown, input: any) => {
        const promo = promotions.find(p => p.id === input.id)!;
        Object.assign(promo, { couponCode: input.couponCode, input });
        return promo;
    });
    const softDeletePromotion = mock.fn(async (_ctx: unknown, id: string) => {
        const promo = promotions.find(p => p.id === id)!;
        promo.deletedAt = new Date();
        return { result: 'DELETED' };
    });
    const registerEarnPolicy = mock.fn();
    const customerService = { create: mock.fn(async (_ctx: unknown, input: any) => ({ id: 'new-cust', ...input })) };
    const service = new AthleteService(connection, customerService, { createPromotion, updatePromotion, softDeletePromotion }, { registerEarnPolicy });
    return { service, db, promotions, createPromotion, updatePromotion, softDeletePromotion, registerEarnPolicy, customerService };
}

function lastUpdate(fn: any) {
    return fn.mock.calls[fn.mock.calls.length - 1].arguments[1];
}

const pedroCode = { code: 'PEDRO10', discountType: 'PERCENTAGE', discountValue: 10, rewardType: 'PERCENTAGE', rewardValue: 5 };

function discountFor(promotionInput: any, subTotal: number): number {
    const action = promotionInput.actions[0];
    const def = action.code === 'order_percentage_discount' ? orderPercentageDiscount : orderFixedDiscount;
    const order = { subTotal, subTotalWithTax: subTotal };
    return def.execute({ channel: { pricesIncludeTax: false } }, order, action.arguments, {}, {});
}

test('converting a customer into an athlete creates a coupon promotion with the code terms', async () => {
    const { service, createPromotion } = createService();

    const result = await service.create(ctx, { customerId: 'pedro', code: { ...pedroCode, code: 'pedro10' } });

    assert.equal(result.success, true);
    assert.equal(result.athlete.codes[0].code, 'PEDRO10', 'stored in canonical upper case');
    const input = createPromotion.mock.calls[0].arguments[1];
    assert.equal(input.couponCode, 'PEDRO10');
    assert.equal(input.enabled, true);
    assert.deepEqual(input.conditions, [{ code: 'athlete_code', arguments: [{ name: 'athleteId', value: String(result.athlete.id) }] }]);
    assert.equal(input.actions[0].code, 'order_percentage_discount');
    assert.match(input.translations[0].name, /Pedro Rodríguez \(PEDRO10\)/);
    assert.equal(result.athlete.codes[0].promotionId, '1000');
});

test('a customer using an athlete code gets exactly the configured discount (via Vendure\'s own action)', async () => {
    const { service, createPromotion } = createService();
    await service.create(ctx, { customerId: 'pedro', code: pedroCode });

    // 100 € basket, PEDRO10 at 10% → 10 € off.
    assert.equal(discountFor(createPromotion.mock.calls[0].arguments[1], 10000), -1000);
});

test('different athletes can offer different discounts, including fixed amounts', async () => {
    const { service, createPromotion } = createService();
    await service.create(ctx, { customerId: 'pedro', code: pedroCode });
    await service.create(ctx, {
        customerId: 'ana',
        code: { code: 'ANA5EUR', discountType: 'FIXED_AMOUNT', discountValue: 500, rewardType: 'FIXED_POINTS', rewardValue: 200 },
    });

    assert.equal(discountFor(createPromotion.mock.calls[0].arguments[1], 10000), -1000);
    assert.equal(createPromotion.mock.calls[1].arguments[1].actions[0].code, 'order_fixed_discount');
    assert.equal(discountFor(createPromotion.mock.calls[1].arguments[1], 10000), -500);
});

test('duplicate codes are rejected, case-insensitively', async () => {
    const { service, db } = createService();
    await service.create(ctx, { customerId: 'pedro', code: pedroCode });

    const result = await service.create(ctx, { customerId: 'ana', code: { ...pedroCode, code: 'Pedro10' } });

    assert.equal(result.success, false);
    assert.match(result.reason, /already in use/);
    assert.equal(db.rows(Athlete).length, 1, 'the whole create is rolled back');
});

test('a code that clashes with an existing (non-athlete) promotion coupon is rejected', async () => {
    const { service } = createService([{ id: '7', couponCode: 'summer' }]);
    const { athlete } = (await service.create(ctx, { customerId: 'pedro' })) as any;

    const result = await service.createCode(ctx, athlete.id, { ...pedroCode, code: 'SUMMER' });

    assert.equal(result.success, false);
    assert.match(result.reason, /existing promotion/);
});

test('a customer can only be an athlete once', async () => {
    const { service } = createService();
    await service.create(ctx, { customerId: 'pedro' });

    const result = await service.create(ctx, { customerId: 'pedro' });

    assert.deepEqual(result, { success: false, reason: 'This customer is already an athlete' });
});

test('invalid terms are rejected before anything is written', async () => {
    const { service, db, createPromotion } = createService();

    const result = await service.create(ctx, { customerId: 'pedro', code: { ...pedroCode, discountValue: 150 } });

    assert.equal(result.success, false);
    assert.equal(db.rows(Athlete).length, 0);
    assert.equal(createPromotion.mock.callCount(), 0);
});

test('disabling a code or the athlete disables the backing promotion', async () => {
    const { service, updatePromotion } = createService();
    const { athlete } = (await service.create(ctx, { customerId: 'pedro', code: pedroCode })) as any;
    const codeId = athlete.codes[0].id;

    await service.updateCode(ctx, codeId, { enabled: false });
    assert.equal(lastUpdate(updatePromotion).enabled, false);

    await service.updateCode(ctx, codeId, { enabled: true });
    assert.equal(lastUpdate(updatePromotion).enabled, true);

    await service.update(ctx, athlete.id, { enabled: false });
    assert.equal(lastUpdate(updatePromotion).enabled, false, 'athlete disabled → code stops applying');
});

test('changing a code updates the same promotion instead of creating a new one', async () => {
    const { service, createPromotion, updatePromotion, db } = createService();
    const { athlete } = (await service.create(ctx, { customerId: 'pedro', code: pedroCode })) as any;

    const result = await service.updateCode(ctx, athlete.codes[0].id, { code: 'PEDRO15', discountValue: 15 });

    assert.equal(result.success, true);
    assert.equal(createPromotion.mock.callCount(), 1);
    const input = updatePromotion.mock.calls[0].arguments[1];
    assert.equal(input.id, '1000');
    assert.equal(input.couponCode, 'PEDRO15');
    assert.equal(discountFor(input, 10000), -1500);
    assert.equal(db.rows(AthleteCode)[0].code, 'PEDRO15');
});

test('regular points policy: active athletes are excluded, disabled athletes and customers are not', async () => {
    const { service, registerEarnPolicy } = createService();
    service.onApplicationBootstrap();
    const policy = registerEarnPolicy.mock.calls[0].arguments[0];
    const { athlete } = (await service.create(ctx, { customerId: 'pedro' })) as any;

    assert.equal(await policy.canEarnForOrder(ctx, { customerId: 'pedro' }), false, 'athlete buys → no regular points');
    assert.equal(await policy.canEarnForOrder(ctx, { customerId: 'ana' }), true, 'normal customer keeps earning');

    await service.update(ctx, athlete.id, { enabled: false });
    assert.equal(await policy.canEarnForOrder(ctx, { customerId: 'pedro' }), true, 'disabled athlete earns like a customer');
});

test('deleting the customer removes the athlete role and kills its codes', async () => {
    const { service, db, promotions, softDeletePromotion, registerEarnPolicy } = createService();
    service.onApplicationBootstrap();
    const policy = registerEarnPolicy.mock.calls[0].arguments[0];
    const { athlete } = (await service.create(ctx, { customerId: 'pedro', code: pedroCode })) as any;

    const removed = await service.removeForDeletedCustomer(ctx, 'pedro');

    assert.equal(removed, true);
    const [row] = db.rows(Athlete);
    assert.ok(row.deletedAt, 'athlete is soft-deleted with its customer');
    assert.equal(row.enabled, false);
    assert.equal(db.rows(AthleteCode)[0].enabled, false);
    assert.equal(softDeletePromotion.mock.callCount(), 1);
    assert.ok(promotions[0].deletedAt, 'the coupon promotion no longer applies at checkout');
    assert.equal(await service.findById(ctx, athlete.id), null, 'no longer listed or editable');
    assert.equal(await service.findByCustomerId(ctx, 'pedro'), null);
    assert.equal((await service.update(ctx, athlete.id, { enabled: true })).success, false, 'cannot be re-enabled');
    assert.equal(await policy.canEarnForOrder(ctx, { customerId: 'pedro' }), true);
    assert.equal(await service.removeForDeletedCustomer(ctx, 'pedro'), false, 'idempotent');
});

test('deleting a regular customer (not an athlete) does nothing', async () => {
    const { service, softDeletePromotion } = createService();
    assert.equal(await service.removeForDeletedCustomer(ctx, 'ana'), false);
    assert.equal(softDeletePromotion.mock.callCount(), 0);
});

test('removing the athlete role keeps the customer, and making them an athlete again restores the same record', async () => {
    const { service, db } = createService();
    const { athlete } = (await service.create(ctx, { customerId: 'pedro', code: pedroCode, notes: 'Triatleta' })) as any;

    assert.deepEqual(await service.removeRole(ctx, athlete.id), { success: true });
    assert.equal(await service.findByCustomerId(ctx, 'pedro'), null);

    const again = await service.create(ctx, { customerId: 'pedro' });

    assert.equal(again.success, true);
    assert.equal(again.athlete.id, athlete.id, 'same row → reward history stays attached');
    assert.equal(db.rows(Athlete).length, 1);
    assert.equal(db.rows(Athlete)[0].deletedAt, null);
    assert.equal(db.rows(Athlete)[0].notes, 'Triatleta');
});
