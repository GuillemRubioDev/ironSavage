import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { InvoicingShopResolver } = require('./invoicing-shop.resolver');

function createResolver({ activeUserId, customer }: { activeUserId?: string; customer?: { id: string } | null }) {
    const list = mock.fn(async (_ctx: unknown, _options: { customerId: string }) => ({ items: [], totalItems: 0 }));
    const invoicingService = { list };
    const findOneByUserId = mock.fn(async (_ctx: unknown, _userId: string) => customer ?? null);
    const customerService = { findOneByUserId };
    const resolver = new InvoicingShopResolver(invoicingService, customerService);
    const ctx = { activeUserId };
    return { resolver, ctx, list, findOneByUserId };
}

test('myInvoices scopes the list query to the caller\'s own resolved customer id, not anything from the client', async () => {
    const { resolver, ctx, list, findOneByUserId } = createResolver({
        activeUserId: 'user-1',
        customer: { id: 'cust-42' },
    });

    // En teoría un cliente podría enviar un objeto `options` cualquiera: nunca debe
    // colarse un `customerId` que sustituya al que sale de la sesión.
    await resolver.myInvoices(ctx, { options: { skip: 0, take: 10 } });

    assert.equal(findOneByUserId.mock.callCount(), 1);
    assert.equal(findOneByUserId.mock.calls[0].arguments[1], 'user-1');
    assert.equal(list.mock.callCount(), 1);
    const [, listOptions] = list.mock.calls[0].arguments;
    assert.equal(listOptions.customerId, 'cust-42');
});

test('myInvoices returns an empty list without querying invoices when nobody is signed in', async () => {
    const { resolver, ctx, list, findOneByUserId } = createResolver({ activeUserId: undefined });

    const result = await resolver.myInvoices(ctx, { options: {} });

    assert.deepEqual(result, { items: [], totalItems: 0 });
    assert.equal(findOneByUserId.mock.callCount(), 0);
    assert.equal(list.mock.callCount(), 0);
});

test('myInvoices returns an empty list if the session user has no matching customer', async () => {
    const { resolver, ctx, list } = createResolver({ activeUserId: 'user-1', customer: null });

    const result = await resolver.myInvoices(ctx, { options: {} });

    assert.deepEqual(result, { items: [], totalItems: 0 });
    assert.equal(list.mock.callCount(), 0);
});
