import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

process.env.REDSYS_MERCHANT_CODE = '999008881';
process.env.REDSYS_TERMINAL = '1';
process.env.REDSYS_SECRET_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
process.env.REDSYS_ENVIRONMENT = 'test';
process.env.REDSYS_NOTIFICATION_URL = 'http://localhost:3000/payments/redsys/notify';
process.env.STOREFRONT_URL = 'http://localhost:3001';

/* eslint-disable @typescript-eslint/no-var-requires */
const { RedsysService } = require('./redsys.service');
const { encodeMerchantParameters, signMerchantParameters } = require('./redsys-signature');
const { RedsysTransaction } = require('./redsys-transaction.entity');
const { RedsysPaymentAttempt } = require('./redsys-payment-attempt.entity');
const { Order } = require('@vendure/core');

const SECRET_KEY = process.env.REDSYS_SECRET_KEY!;
// handleNotification only forwards this to RequestContext for transaction affinity —
// the fakes in this file don't care about its contents.
const FAKE_REQ = {} as any;

function buildNotificationBody(order: string, responseCode: string, authorisationCode = '123456') {
    const params = {
        Ds_Order: order,
        Ds_Response: responseCode,
        Ds_Amount: '1999',
        Ds_Currency: '978',
        Ds_AuthorisationCode: authorisationCode,
    };
    const merchantParameters = encodeMerchantParameters(params);
    const signature = signMerchantParameters(SECRET_KEY, order, merchantParameters);
    return { Ds_SignatureVersion: 'HMAC_SHA256_V1', Ds_MerchantParameters: merchantParameters, Ds_Signature: signature };
}

function createFakeRedsysTransactionRepository() {
    // Minimal in-memory stand-in for the TypeORM repository, keyed by
    // merchantOrder like the real unique index — enough to exercise the
    // findOne-then-insert idempotency dance without a real database.
    const rows = new Map<string, {merchantOrder: string}>();
    return {
        findOne: mock.fn(async ({where: {merchantOrder}}: {where: {merchantOrder: string}}) => rows.get(merchantOrder) ?? null),
        insert: mock.fn(async (row: {merchantOrder: string}) => {
            if (rows.has(row.merchantOrder)) {
                const err: any = new Error('duplicate key value violates unique constraint');
                err.code = '23505';
                throw err;
            }
            rows.set(row.merchantOrder, row);
        }),
    };
}

/**
 * Minimal in-memory stand-in for RedsysPaymentAttempt, keyed by merchantOrder
 * like the real unique index. Pre-seeded with `merchantOrder === orderCode`
 * for the given order, so tests that build a notification body directly
 * (bypassing buildPaymentForm, which is what normally creates this mapping)
 * still resolve to the right order — matching how notification tests
 * already use order.code as the attempt identifier.
 */
function createFakeAttemptRepository(order: { code: string }) {
    const rows = new Map<string, {merchantOrder: string; orderCode: string}>([
        [order.code, { merchantOrder: order.code, orderCode: order.code }],
    ]);
    return {
        findOne: mock.fn(async ({where: {merchantOrder}}: {where: {merchantOrder: string}}) => rows.get(merchantOrder) ?? null),
        insert: mock.fn(async (row: {merchantOrder: string; orderCode: string}) => {
            rows.set(row.merchantOrder, row);
        }),
    };
}

function createService(order: { id: string; code: string; state: string }) {
    // The real code distinguishes success from failure via `result instanceof Order`,
    // so the mock must return a real Order instance, not a duck-typed lookalike.
    // A declined payment is real Vendure behaviour too: addPaymentToOrder reports it
    // as a PaymentDeclinedError even though the Payment itself is still saved.
    const addPaymentToOrder = mock.fn(async (_ctx: unknown, _orderId: unknown, input: {metadata: {approved: boolean}}) =>
        input.metadata.approved
            ? new Order({ ...order, state: 'PaymentSettled' })
            : { __typename: 'PaymentDeclinedError', errorCode: 'PAYMENT_DECLINED_ERROR', message: 'PAYMENT_DECLINED_ERROR' },
    );
    const transitionToState = mock.fn(async (..._args: unknown[]) => new Order({ ...order, state: 'ArrangingPayment' }));
    const findOneByCode = mock.fn(async (..._args: unknown[]) => order);

    // OrderService.addPaymentToOrder / transitionToState success is detected via
    // `instanceof Order` in the real code — swap that check out for a duck-typed
    // marker here so this test doesn't need to construct a real TypeORM entity.
    const orderServiceMock = { addPaymentToOrder, transitionToState, findOneByCode };
    const fakeRepository = createFakeRedsysTransactionRepository();
    const fakeAttemptRepository = createFakeAttemptRepository(order);
    const connectionMock = {
        getRepository: (_ctx: unknown, entity: unknown) =>
            entity === RedsysPaymentAttempt ? fakeAttemptRepository : fakeRepository,
        // Real withTransaction opens/commits/rolls back a DB transaction; the fake
        // just runs the callback with the same ctx, which is enough to exercise
        // this service's own logic (idempotency, ordering, error propagation).
        withTransaction: async (ctx: unknown, work: (ctx: unknown) => Promise<unknown>) => work(ctx),
    };
    const channelServiceMock = { getDefaultChannel: async () => ({ id: 1, token: 'default' }) };
    const paymentMethodServiceMock = {
        findAll: async () => ({
            items: [{ code: 'redsys', handler: { code: 'redsys-payment-handler' } }],
            totalItems: 1,
        }),
    };

    const service = new RedsysService(connectionMock, orderServiceMock, channelServiceMock, paymentMethodServiceMock);
    return { service, addPaymentToOrder, transitionToState, findOneByCode, connectionMock, fakeRepository, fakeAttemptRepository };
}

test('buildPaymentForm takes the amount from the Order, not any external input', async () => {
    process.env.REDSYS_MERCHANT_CODE = '999008881';
    const { service } = createService({ id: '1', code: '1234ABCD5678', state: 'ArrangingPayment' });
    const order = {
        code: '1234ABCD5678',
        currencyCode: 'EUR',
        totalWithTax: 4999,
        lines: [{ id: '1' }],
    };

    const result = await service.buildPaymentForm({}, order);
    assert.equal(result.success, true);

    const decoded = JSON.parse(Buffer.from(result.form.merchantParameters, 'base64').toString('utf8'));
    assert.equal(decoded.DS_MERCHANT_AMOUNT, '4999');
    // DS_MERCHANT_ORDER is a fresh per-attempt value (not the Vendure order
    // code itself) — see RedsysPaymentAttempt: Redsys rejects a resend of the
    // same order number, so each attempt needs a distinct one, in Redsys'
    // required format (4 numeric + 8 alphanumeric).
    assert.match(decoded.DS_MERCHANT_ORDER, /^\d{4}[0-9A-Z]{8}$/);
    assert.notEqual(decoded.DS_MERCHANT_ORDER, '1234ABCD5678');
});

test('buildPaymentForm records the attempt so a notification can be traced back to the order', async () => {
    const { service, fakeAttemptRepository } = createService({ id: '1', code: '1234ABCD5678', state: 'ArrangingPayment' });
    const order = {
        code: '1234ABCD5678',
        currencyCode: 'EUR',
        totalWithTax: 4999,
        lines: [{ id: '1' }],
    };

    const result = await service.buildPaymentForm({}, order);
    assert.equal(result.success, true);

    const decoded = JSON.parse(Buffer.from(result.form.merchantParameters, 'base64').toString('utf8'));
    assert.equal(fakeAttemptRepository.insert.mock.callCount(), 1);
    const [insertedRow] = fakeAttemptRepository.insert.mock.calls[0].arguments as [{merchantOrder: string; orderCode: string}];
    assert.equal(insertedRow.merchantOrder, decoded.DS_MERCHANT_ORDER);
    assert.equal(insertedRow.orderCode, order.code);
});

test('buildPaymentForm rejects an order with no lines', async () => {
    const { service } = createService({ id: '1', code: '1234ABCD5678', state: 'ArrangingPayment' });
    const result = await service.buildPaymentForm({}, { code: '1234ABCD5678', currencyCode: 'EUR', totalWithTax: 100, lines: [] });
    assert.equal(result.success, false);
});

test('handleNotification records an approved payment for an OK response', async () => {
    // Vendure's OrderService.addPaymentToOrder success path is `result instanceof Order`.
    // We can't easily construct a real `Order` entity here, so this test instead
    // asserts on *what the service attempted to do*: transition + addPaymentToOrder
    // called once each, with approved:true metadata.
    const order = { id: '1', code: '0001AAAAAAAA', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, transitionToState } = createService(order);

    const body = buildNotificationBody(order.code, '0000');
    await service.handleNotification(body, FAKE_REQ);

    assert.equal(transitionToState.mock.callCount(), 0); // already ArrangingPayment
    assert.equal(addPaymentToOrder.mock.callCount(), 1);
    const [, , input] = addPaymentToOrder.mock.calls[0].arguments as [unknown, unknown, { metadata: { approved: boolean; responseCode: string } }];
    assert.equal(input.metadata.approved, true);
    assert.equal(input.metadata.responseCode, '0000');
});

test('handleNotification records a declined payment for a KO response, without throwing', async () => {
    // addPaymentToOrder reports a decline as a PaymentDeclinedError, not by throwing —
    // that's an expected, terminal outcome and must be treated as "successfully
    // handled" (not a system failure), or a declined order could never be marked
    // as processed and every Redsys retry of the same decline would be reprocessed.
    const order = { id: '1', code: '0002BBBBBBBB', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder } = createService(order);

    const body = buildNotificationBody(order.code, '0180'); // 0180 = card declined
    const result = await service.handleNotification(body, FAKE_REQ);

    assert.equal(result.alreadyProcessed, false);
    assert.equal(addPaymentToOrder.mock.callCount(), 1);
    const [, , input] = addPaymentToOrder.mock.calls[0].arguments as [unknown, unknown, { metadata: { approved: boolean; responseCode: string } }];
    assert.equal(input.metadata.approved, false);

    // A retried notification for the same decline must be recognised as a duplicate.
    const retry = await service.handleNotification(body, FAKE_REQ);
    assert.equal(retry.alreadyProcessed, true);
    assert.equal(addPaymentToOrder.mock.callCount(), 1);
});

test('handleNotification rejects a notification with an invalid signature, and never touches the order', async () => {
    const order = { id: '1', code: '0003CCCCCCCC', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, findOneByCode } = createService(order);

    const body = buildNotificationBody(order.code, '0000');
    body.Ds_Signature = 'clearly-not-a-valid-signature';

    await assert.rejects(() => service.handleNotification(body, FAKE_REQ), /Invalid Redsys signature/);
    assert.equal(findOneByCode.mock.callCount(), 0);
    assert.equal(addPaymentToOrder.mock.callCount(), 0);
});

test('handleNotification is idempotent: a duplicate notification is not processed twice', async () => {
    const order = { id: '1', code: '0004DDDDDDDD', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder } = createService(order);

    const body = buildNotificationBody(order.code, '0000');
    const first = await service.handleNotification(body, FAKE_REQ);
    const second = await service.handleNotification(body, FAKE_REQ);

    assert.equal(first.alreadyProcessed, false);
    assert.equal(second.alreadyProcessed, true);
    assert.equal(addPaymentToOrder.mock.callCount(), 1);
});

test('a second, distinct payment attempt for the same order (e.g. retry after a decline) is processed, not swallowed as a duplicate', async () => {
    // Regression test for the real-world bug this fixes: a declined card
    // followed by a successful retry of the *same Vendure order* must each be
    // treated as their own attempt — not collapsed by orderCode-keyed
    // idempotency, which would silently drop the successful retry.
    const order = { id: '1', code: '0006FFFFFFFF', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, fakeAttemptRepository } = createService(order);

    // First attempt (declined) — distinct merchantOrder from the second.
    const firstAttemptOrder = '0006AAAAAAAA';
    await fakeAttemptRepository.insert({ merchantOrder: firstAttemptOrder, orderCode: order.code });
    const declinedBody = buildNotificationBody(firstAttemptOrder, '0180');
    const declinedResult = await service.handleNotification(declinedBody, FAKE_REQ);
    assert.equal(declinedResult.alreadyProcessed, false);

    // Second, later attempt (approved) — a different merchantOrder, same order.
    const secondAttemptOrder = '0006BBBBBBBB';
    await fakeAttemptRepository.insert({ merchantOrder: secondAttemptOrder, orderCode: order.code });
    const approvedBody = buildNotificationBody(secondAttemptOrder, '0000');
    const approvedResult = await service.handleNotification(approvedBody, FAKE_REQ);
    assert.equal(approvedResult.alreadyProcessed, false);
    assert.equal(approvedResult.orderCode, order.code);

    assert.equal(addPaymentToOrder.mock.callCount(), 2);
    const [, , declinedInput] = addPaymentToOrder.mock.calls[0].arguments as [unknown, unknown, { metadata: { approved: boolean } }];
    const [, , approvedInput] = addPaymentToOrder.mock.calls[1].arguments as [unknown, unknown, { metadata: { approved: boolean } }];
    assert.equal(declinedInput.metadata.approved, false);
    assert.equal(approvedInput.metadata.approved, true);
});

test('a notification is NOT marked as processed if addPaymentToOrder fails, so a retry can still succeed', async () => {
    // Regression test: an earlier version of this code recorded the dedup row
    // *before* calling addPaymentToOrder, so a downstream failure (e.g. a missing
    // DB transaction) permanently and silently blocked every future retry of an
    // order that was never actually paid.
    const order = { id: '1', code: '0005EEEEEEEE', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, fakeRepository } = createService(order);

    addPaymentToOrder.mock.mockImplementationOnce(async () => {
        throw new Error('simulated failure, e.g. missing transaction');
    });

    const body = buildNotificationBody(order.code, '0000');
    await assert.rejects(() => service.handleNotification(body, FAKE_REQ));
    assert.equal(await fakeRepository.findOne({ where: { merchantOrder: order.code } }), null);

    // Retry should be attempted again, not silently dropped as a duplicate.
    const retry = await service.handleNotification(body, FAKE_REQ);
    assert.equal(retry.alreadyProcessed, false);
    assert.equal(addPaymentToOrder.mock.callCount(), 2);
});
