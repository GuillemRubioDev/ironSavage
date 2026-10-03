import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { createRewardServices, makeOrder, seedAthlete } = require('./athletes.test-utils');
const { setLoyaltyConfig } = require('../loyalty/loyalty-config');
const { LoyaltyAccount } = require('../loyalty/loyalty-account.entity');
const { LoyaltyTransaction } = require('../loyalty/loyalty-transaction.entity');
const { AthleteCode } = require('./athlete-code.entity');
const { AthleteReward } = require('./athlete-reward.entity');
const { AthleteRewardReversal } = require('./athlete-reward-reversal.entity');

setLoyaltyConfig({ pointsPerEuro: 1, pointValueInCents: 1, minRedeemablePoints: 100, maxDiscountPerOrderCents: 2000 });

const ctx = {};

function balanceOf(db: any, customerId: string): number {
    return db.rows(LoyaltyAccount).find((a: any) => a.customerId === customerId)?.balance ?? 0;
}

// PEDRO10: 10 % para el cliente, 5 % para Pedro. Una cesta de 100 € queda en 90 €
// tras el descuento, así que la base de la recompensa (subTotalWithTax) es 9000.
async function setupPedro() {
    const services = createRewardServices();
    const pedro = await seedAthlete(services.db, { customerId: 'pedro', code: 'PEDRO10', promotionId: 'promo-pedro', discountValue: 10, rewardValue: 5 });
    return { ...services, pedro };
}

function pedroOrder(id = '100', overrides: Record<string, unknown> = {}) {
    return makeOrder({
        id,
        customerId: 'cust-1',
        subTotalWithTax: 9000,
        couponCodes: ['PEDRO10'],
        promotionIds: ['promo-pedro'],
        discountWithTax: 1000,
        ...overrides,
    });
}

test('a customer order with an athlete code credits the athlete the configured reward', async () => {
    const { db, rewardService, pedro } = await setupPedro();

    const result = await rewardService.grantForLoadedOrder(ctx, pedroOrder());

    assert.deepEqual(result, { granted: true, points: 450 }); // 5 % de 90 €
    assert.equal(balanceOf(db, 'pedro'), 450);
    const [reward] = db.rows(AthleteReward);
    assert.equal(reward.athleteId, pedro.athlete.id);
    assert.equal(reward.code, 'PEDRO10');
    assert.equal(reward.orderId, '100');
    assert.equal(reward.customerId, 'cust-1');
    assert.equal(reward.baseAmount, 9000);
    assert.equal(reward.customerDiscountAmount, 1000);
    assert.equal(reward.rewardType, 'PERCENTAGE');
    assert.equal(reward.rewardValue, 5);
    assert.equal(reward.pointValueInCents, 1);
    assert.equal(reward.status, 'ACTIVE');
    const [ledger] = db.rows(LoyaltyTransaction);
    assert.equal(ledger.type, 'ATHLETE_REWARD');
    assert.equal(ledger.points, 450);
    assert.equal(ledger.orderId, '100');
    assert.equal(reward.loyaltyTransactionId, ledger.id, 'reward row points at its ledger entry');
});

test('the buyer earns nothing from the athlete reward itself — it goes only to the athlete', async () => {
    const { db, rewardService } = await setupPedro();
    await rewardService.grantForLoadedOrder(ctx, pedroOrder());
    assert.equal(balanceOf(db, 'cust-1'), 0);
});

test('different athletes can have different reward percentages', async () => {
    const { db, rewardService } = await setupPedro();
    await seedAthlete(db, { customerId: 'ana', code: 'ANA20', promotionId: 'promo-ana', discountValue: 20, rewardValue: 8 });

    await rewardService.grantForLoadedOrder(ctx, pedroOrder('1'));
    await rewardService.grantForLoadedOrder(
        ctx,
        makeOrder({ id: '2', customerId: 'cust-2', subTotalWithTax: 8000, couponCodes: ['ANA20'], promotionIds: ['promo-ana'], discountWithTax: 2000 }),
    );

    assert.equal(balanceOf(db, 'pedro'), 450); // 5 % de 90 €
    assert.equal(balanceOf(db, 'ana'), 640); // 8 % de 80 €
});

test('processing the same PaymentSettled twice does not duplicate the reward', async () => {
    const { db, rewardService } = await setupPedro();

    const first = await rewardService.grantForLoadedOrder(ctx, pedroOrder());
    const second = await rewardService.grantForLoadedOrder(ctx, pedroOrder());

    assert.equal(first.granted, true);
    assert.deepEqual(second, { granted: false, reason: 'ALREADY_GRANTED' });
    assert.equal(db.rows(AthleteReward).length, 1);
    assert.equal(db.rows(LoyaltyTransaction).length, 1);
    assert.equal(balanceOf(db, 'pedro'), 450);
});

test('concurrent grants for the same order credit the athlete only once', async () => {
    const { db, rewardService } = await setupPedro();

    const results = await Promise.all([
        rewardService.grantForLoadedOrder(ctx, pedroOrder()),
        rewardService.grantForLoadedOrder(ctx, pedroOrder()),
    ]);

    assert.equal(results.filter((r: any) => r.granted).length, 1);
    assert.equal(balanceOf(db, 'pedro'), 450);
});

test('a disabled code produces no reward (Vendure never applied its promotion)', async () => {
    const { db, rewardService } = await setupPedro();
    // Con el código o la promoción desactivados, applyCouponCode lo rechaza, así que
    // el pedido no lleva esa promoción, y sin descuento no hay recompensa.
    const result = await rewardService.grantForLoadedOrder(ctx, pedroOrder('100', { promotionIds: [], couponCodes: [] }));

    assert.equal(result.granted, false);
    assert.equal(db.rows(AthleteReward).length, 0);
    assert.equal(balanceOf(db, 'pedro'), 0);
});

test('a disabled athlete earns no reward', async () => {
    const { db, rewardService } = createRewardServices();
    await seedAthlete(db, { customerId: 'pedro', code: 'PEDRO10', promotionId: 'promo-pedro', enabled: false });

    const result = await rewardService.grantForLoadedOrder(ctx, pedroOrder());

    assert.deepEqual(result, { granted: false, reason: 'ATHLETE_DISABLED' });
    assert.equal(balanceOf(db, 'pedro'), 0);
});

test('an athlete cannot earn a reward from their own code', async () => {
    const { db, rewardService } = await setupPedro();

    const result = await rewardService.grantForLoadedOrder(ctx, pedroOrder('100', { customerId: 'pedro' }));

    assert.deepEqual(result, { granted: false, reason: 'OWN_CODE' });
    assert.equal(balanceOf(db, 'pedro'), 0);
});

test('a regular coupon (not an athlete code) never produces an athlete reward', async () => {
    const { db, rewardService } = await setupPedro();

    const result = await rewardService.grantForLoadedOrder(
        ctx,
        makeOrder({ id: '5', customerId: 'cust-1', subTotalWithTax: 9000, couponCodes: ['SUMMER'], promotionIds: ['promo-summer'] }),
    );

    assert.deepEqual(result, { granted: false, reason: 'NO_ATHLETE_CODE' });
    assert.equal(db.rows(AthleteReward).length, 0);
});

test('changing the athlete reward % later does not alter historical rewards', async () => {
    const { db, rewardService, pedro } = await setupPedro();
    await rewardService.grantForLoadedOrder(ctx, pedroOrder('1'));

    // El administrador sube a Pedro del 5 % al 8 %.
    await db.connection.getRepository(ctx, AthleteCode).update({ id: pedro.code.id }, { rewardValue: 8 });
    await rewardService.grantForLoadedOrder(ctx, pedroOrder('2'));

    const [oldReward, newReward] = db.rows(AthleteReward);
    assert.equal(oldReward.rewardValue, 5);
    assert.equal(oldReward.points, 450);
    assert.equal(newReward.rewardValue, 8);
    assert.equal(newReward.points, 720);
    assert.equal(balanceOf(db, 'pedro'), 1170);
});

test('cancelling the order reverts the whole reward, idempotently', async () => {
    const { db, rewardService } = await setupPedro();
    await rewardService.grantForLoadedOrder(ctx, pedroOrder());

    const first = await rewardService.revertForCancellation(ctx, '100');
    const second = await rewardService.revertForCancellation(ctx, '100');

    assert.equal(first.reverted, 450);
    assert.equal(second.reverted, 0);
    assert.equal(balanceOf(db, 'pedro'), 0);
    const [reward] = db.rows(AthleteReward);
    assert.equal(reward.status, 'REVERTED');
    assert.equal(reward.revertedPoints, 450);
    assert.equal(reward.points, 450, 'the original grant stays on record');
    const reversals = db.rows(AthleteRewardReversal);
    assert.equal(reversals.length, 1);
    assert.equal(reversals[0].reason, 'ORDER_CANCELLED');
    const ledgerTypes = db.rows(LoyaltyTransaction).map((t: any) => `${t.type}:${t.points}`);
    assert.deepEqual(ledgerTypes, ['ATHLETE_REWARD:450', 'ATHLETE_REWARD_REVERSAL:-450']);
});

test('a partial refund reverts a proportional share once, and a later cancellation reverts the rest', async () => {
    const { db, rewardService } = await setupPedro();
    const order = pedroOrder('100', { totalWithTax: 9500 }); // 90 € + 5 € de envío
    await rewardService.grantForLoadedOrder(ctx, order);

    const refund = { id: 'refund-1', total: 4750 }; // la mitad del pedido
    const first = await rewardService.revertForRefund(ctx, order, refund);
    const duplicate = await rewardService.revertForRefund(ctx, order, refund);

    assert.equal(first.reverted, 225);
    assert.equal(duplicate.reverted, 0, 'same refund event delivered twice');
    assert.equal(balanceOf(db, 'pedro'), 225);
    assert.equal(db.rows(AthleteReward)[0].status, 'PARTIALLY_REVERTED');

    const cancel = await rewardService.revertForCancellation(ctx, '100');
    assert.equal(cancel.reverted, 225);
    assert.equal(balanceOf(db, 'pedro'), 0);
    assert.equal(db.rows(AthleteReward)[0].status, 'REVERTED');
});

test('reverting points the athlete already spent never pushes the balance negative, and records the shortfall', async () => {
    const { db, rewardService, loyaltyService } = await setupPedro();
    await rewardService.grantForLoadedOrder(ctx, pedroOrder());
    // Pedro gasta 400 de sus 450 puntos en un pedido suyo.
    const spend = await loyaltyService.redeemPoints(ctx, { id: '900', code: 'OWN', customerId: 'pedro', totalWithTax: 5000, surcharges: [] }, 400);
    assert.equal(spend.success, true);

    const result = await rewardService.revertForCancellation(ctx, '100');

    assert.equal(result.reverted, 450);
    assert.equal(balanceOf(db, 'pedro'), 0);
    const [reward] = db.rows(AthleteReward);
    assert.equal(reward.unrecoveredPoints, 400);
    assert.equal(db.rows(AthleteRewardReversal)[0].debitedPoints, 50);
});

test('an admin can manually revert a reward', async () => {
    const { db, rewardService } = await setupPedro();
    await rewardService.grantForLoadedOrder(ctx, pedroOrder());
    const [reward] = db.rows(AthleteReward);

    const result = await rewardService.revertManually(ctx, reward.id, 'Fraudulent order', 'admin-1');

    assert.equal(result.reverted, 450);
    assert.equal(balanceOf(db, 'pedro'), 0);
    const [reversal] = db.rows(AthleteRewardReversal);
    assert.equal(reversal.reason, 'MANUAL');
    assert.equal(reversal.note, 'Fraudulent order');
    assert.equal(reversal.administratorUserId, 'admin-1');
});

test('an athlete can spend reward points on their own purchase through the regular redemption flow', async () => {
    const { db, rewardService, loyaltyService, surcharges } = await setupPedro();
    await rewardService.grantForLoadedOrder(ctx, pedroOrder());

    const result = await loyaltyService.redeemPoints(ctx, { id: '901', code: 'OWN2', customerId: 'pedro', totalWithTax: 5000, surcharges: [] }, 300);

    assert.equal(result.success, true);
    assert.equal(result.discountCents, 300);
    assert.equal(balanceOf(db, 'pedro'), 150);
    assert.equal(surcharges[0].listPrice, -300);
});
