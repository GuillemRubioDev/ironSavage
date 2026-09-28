import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { Permission, PERMISSIONS_METADATA_KEY } = require('@vendure/core');
const { AthletesAdminResolver } = require('./athletes-admin.resolver');
const { AthletesShopResolver } = require('./athletes-shop.resolver');
const { athletePermission } = require('./athlete.permission');

function permissionsOf(resolverClass: any, method: string): string[] {
    return Reflect.getMetadata(PERMISSIONS_METADATA_KEY, resolverClass.prototype[method]) ?? [];
}

const ADMIN_OPERATIONS = ['athletes', 'athlete', 'athleteByCustomer', 'athleteRewards', 'athleteCodeOrders', 'createAthlete', 'updateAthlete', 'createAthleteCode', 'updateAthleteCode', 'revertAthleteReward', 'removeAthleteRole'];

test('every admin athlete operation requires an Athlete permission — never Owner/Public, so customers and athletes are locked out', () => {
    const allowed = new Set([athletePermission.Read, athletePermission.Create, athletePermission.Update, athletePermission.Delete]);
    for (const method of ADMIN_OPERATIONS) {
        const perms = permissionsOf(AthletesAdminResolver, method);
        assert.ok(perms.length > 0, `${method} has no @Allow`);
        for (const perm of perms) {
            assert.ok(allowed.has(perm), `${method} allows ${perm}`);
            assert.notEqual(perm, Permission.Owner);
            assert.notEqual(perm, Permission.Public);
        }
    }
    assert.deepEqual(permissionsOf(AthletesAdminResolver, 'revertAthleteReward'), [athletePermission.Update]);
    assert.deepEqual(permissionsOf(AthletesAdminResolver, 'createAthlete'), [athletePermission.Create]);
    assert.deepEqual(permissionsOf(AthletesAdminResolver, 'removeAthleteRole'), [athletePermission.Delete]);
});

test('the athlete panel queries are Owner-only (signed-in), not public', () => {
    assert.deepEqual(permissionsOf(AthletesShopResolver, 'myAthleteProfile'), [Permission.Owner]);
    assert.deepEqual(permissionsOf(AthletesShopResolver, 'myAthleteRewards'), [Permission.Owner]);
});

function createShopResolver(customer: { id: string } | null, athlete: any) {
    const findByCustomerId = mock.fn(async (_ctx: unknown, _customerId: string) => athlete);
    const listRewards = mock.fn(async () => ({
        totalItems: 1,
        items: [
            {
                id: 'r1',
                createdAt: new Date('2026-01-01'),
                code: 'PEDRO10',
                orderCode: 'ORD1',
                baseAmount: 9000,
                currencyCode: 'EUR',
                points: 450,
                revertedPoints: 0,
                status: 'ACTIVE',
                customerId: 'buyer-1',
                customerDiscountAmount: 1000,
            },
        ],
    }));
    const getStats = mock.fn(async () => ({ totalRewardPoints: 450, revertedRewardPoints: 0, netRewardPoints: 450, rewardedOrders: 1 }));
    const findOneByUserId = mock.fn(async (_ctx: unknown, _userId: string) => customer);
    const resolver = new AthletesShopResolver({ findByCustomerId }, { listRewards, getStats }, { findOneByUserId });
    return { resolver, findByCustomerId, listRewards, findOneByUserId };
}

test('the athlete panel is resolved from the session, and never exposes the buyer', async () => {
    const athlete = { id: 'a1', enabled: true, codes: [] };
    const { resolver, findByCustomerId, findOneByUserId } = createShopResolver({ id: 'pedro' }, athlete);

    const result = await resolver.myAthleteRewards({ activeUserId: 'user-pedro' }, { options: { take: 10 } });

    assert.equal(findOneByUserId.mock.calls[0].arguments[1], 'user-pedro');
    assert.equal(findByCustomerId.mock.calls[0].arguments[1], 'pedro');
    assert.deepEqual(Object.keys(result.items[0]).sort(), ['baseAmount', 'code', 'createdAt', 'currencyCode', 'id', 'orderCode', 'points', 'revertedPoints', 'status']);
});

test('a regular customer gets no athlete profile and an empty reward list', async () => {
    const { resolver, listRewards } = createShopResolver({ id: 'cust-1' }, null);

    assert.equal(await resolver.myAthleteProfile({ activeUserId: 'user-1' }), null);
    assert.deepEqual(await resolver.myAthleteRewards({ activeUserId: 'user-1' }, {}), { items: [], totalItems: 0 });
    assert.equal(listRewards.mock.callCount(), 0);
});

test('an anonymous session gets nothing', async () => {
    const { resolver, findOneByUserId } = createShopResolver(null, null);

    assert.equal(await resolver.myAthleteProfile({ activeUserId: undefined }), null);
    assert.equal(findOneByUserId.mock.callCount(), 0);
});
