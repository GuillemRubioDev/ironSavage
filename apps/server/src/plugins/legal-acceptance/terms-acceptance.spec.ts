import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { isValidTermsVersion, termsAcceptanceOrderProcess, orderTermsCustomFields, TERMS_NOT_ACCEPTED_MESSAGE } = require('./terms-acceptance');
const { LegalAcceptanceShopResolver } = require('./legal-acceptance.resolver');

function guard(apiType: string, from: string, to: string, customFields: Record<string, unknown> = {}) {
    return termsAcceptanceOrderProcess.onTransitionStart(from, to, { ctx: { apiType }, order: { customFields } });
}

test('only real YYYY-MM-DD dates are accepted as terms versions', () => {
    assert.equal(isValidTermsVersion('2026-09-28'), true);
    for (const bad of ['2026-9-28', '2026-02-30', '28/09/2026', '', 'latest', 20260928, null, undefined]) {
        assert.equal(isValidTermsVersion(bad), false, String(bad));
    }
});

test('the acceptance fields cannot be written through any API and are not exposed in the shop', () => {
    assert.deepEqual(orderTermsCustomFields.map((f: any) => f.name), ['termsAcceptedAt', 'termsVersion']);
    for (const field of orderTermsCustomFields) {
        assert.equal(field.readonly, true, field.name);
        assert.equal(field.public, false, field.name);
        assert.equal(field.nullable, true, `${field.name} (existing orders have no record)`);
    }
});

test('the storefront cannot move an order to payment without an acceptance record', () => {
    assert.equal(guard('shop', 'AddingItems', 'ArrangingPayment'), TERMS_NOT_ACCEPTED_MESSAGE);
    assert.equal(guard('shop', 'AddingItems', 'ArrangingPayment', { termsAcceptedAt: new Date() }), TERMS_NOT_ACCEPTED_MESSAGE);
    assert.equal(guard('shop', 'AddingItems', 'ArrangingPayment', { termsAcceptedAt: new Date(), termsVersion: '2026-09-28' }), undefined);
});

test('admin-created orders and every other transition are not affected', () => {
    assert.equal(guard('admin', 'AddingItems', 'ArrangingPayment'), undefined);
    assert.equal(guard('shop', 'ArrangingPayment', 'AddingItems'), undefined);
    assert.equal(guard('shop', 'ArrangingPayment', 'PaymentSettled'), undefined);
    assert.equal(guard('shop', 'Modifying', 'ArrangingAdditionalPayment'), undefined);
});

function resolverWith(activeOrder: unknown) {
    const updates: unknown[] = [];
    const resolver = new LegalAcceptanceShopResolver(
        { getActiveOrder: async () => activeOrder },
        { getRepository: () => ({ update: async (id: unknown, patch: unknown) => updates.push({ id, patch }) }) },
    );
    return { resolver, updates };
}

test('acceptTermsForActiveOrder stamps the server time and the version on the active order', async () => {
    const { resolver, updates } = resolverWith({ id: 7 });
    const before = Date.now();
    assert.equal(await resolver.acceptTermsForActiveOrder({}, { version: '2026-09-28' }), true);
    assert.equal(updates.length, 1);
    const { id, patch } = updates[0] as { id: number; patch: { customFields: { termsAcceptedAt: Date; termsVersion: string } } };
    assert.equal(id, 7);
    assert.equal(patch.customFields.termsVersion, '2026-09-28');
    assert.ok(patch.customFields.termsAcceptedAt.getTime() >= before);
});

test('acceptTermsForActiveOrder rejects invalid versions and sessions without an active order', async () => {
    const { resolver, updates } = resolverWith({ id: 7 });
    await assert.rejects(resolver.acceptTermsForActiveOrder({}, { version: 'whatever' }), /Invalid terms version/);
    await assert.rejects(resolverWith(undefined).resolver.acceptTermsForActiveOrder({}, { version: '2026-09-28' }), /no active order/);
    assert.equal(updates.length, 0);
});
