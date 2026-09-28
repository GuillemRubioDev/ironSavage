import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { athleteCodeCondition, setAthleteConditionConnection } = require('./athlete-promotion-condition');
const { createFakeDb, seedAthlete } = require('./athletes.test-utils');

async function setup() {
    const db = createFakeDb();
    const pedro = await seedAthlete(db, { customerId: 'pedro', code: 'PEDRO10', promotionId: 'promo-pedro' });
    const ana = await seedAthlete(db, { customerId: 'ana', code: 'ANA20', promotionId: 'promo-ana' });
    setAthleteConditionConnection(db.connection);
    return { db, pedro, ana };
}

function check(athleteId: string, order: Record<string, unknown>, couponCode: string) {
    return athleteCodeCondition.check({}, order, [{ name: 'athleteId', value: athleteId }], { couponCode });
}

test('the discount applies when another customer uses the code', async () => {
    const { pedro } = await setup();
    assert.equal(await check(pedro.athlete.id, { customer: { id: 'cust-1' }, couponCodes: ['PEDRO10'] }, 'PEDRO10'), true);
});

test('the discount applies before the customer is known (guest cart), and is re-checked once they are', async () => {
    const { pedro } = await setup();
    assert.equal(await check(pedro.athlete.id, { couponCodes: ['PEDRO10'] }, 'PEDRO10'), true);
    assert.equal(await check(pedro.athlete.id, { customerId: 'pedro', couponCodes: ['PEDRO10'] }, 'PEDRO10'), false);
});

test('an athlete cannot use their own code', async () => {
    const { pedro } = await setup();
    assert.equal(await check(pedro.athlete.id, { customer: { id: 'pedro' }, couponCodes: ['PEDRO10'] }, 'PEDRO10'), false);
});

test('a disabled athlete\'s code does not apply', async () => {
    const { db, pedro } = await setup();
    const { Athlete } = require('./athlete.entity');
    await db.connection.getRepository({}, Athlete).update({ id: pedro.athlete.id }, { enabled: false });
    assert.equal(await check(pedro.athlete.id, { customer: { id: 'cust-1' }, couponCodes: ['PEDRO10'] }, 'PEDRO10'), false);
});

test('only the first athlete code on an order applies; regular coupons can still be combined', async () => {
    const { pedro, ana } = await setup();
    const order = { customer: { id: 'cust-1' }, couponCodes: ['SUMMER', 'ANA20', 'PEDRO10'] };
    assert.equal(await check(ana.athlete.id, order, 'ANA20'), true);
    assert.equal(await check(pedro.athlete.id, order, 'PEDRO10'), false);
});
