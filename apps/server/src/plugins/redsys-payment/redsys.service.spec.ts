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
// handleNotification solo pasa esto al RequestContext por afinidad de transacción;
// a los sustitutos de este archivo no les importa su contenido.
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
    // Sustituto mínimo en memoria del repositorio TypeORM, con clave merchantOrder
    // como el índice único real: basta para probar la idempotencia de
    // «buscar y luego insertar» sin una base de datos real.
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
 * Sustituto mínimo en memoria de RedsysPaymentAttempt, con clave merchantOrder como
 * el índice único real. Viene precargado con `merchantOrder === orderCode` para el
 * pedido dado, para que los tests que construyen la notificación directamente (sin
 * buildPaymentForm, que es quien crea normalmente esta relación) sigan llegando al
 * pedido correcto, igual que los tests de notificación ya usan order.code como
 * identificador del intento.
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
    // El código real distingue éxito de fallo con `result instanceof Order`, así que el
    // mock debe devolver una instancia real de Order, no algo con la misma forma. Un
    // pago denegado también es comportamiento real de Vendure: addPaymentToOrder lo
    // devuelve como PaymentDeclinedError aunque el Payment se guarde igualmente.
    const addPaymentToOrder = mock.fn(async (_ctx: unknown, _orderId: unknown, input: {metadata: {approved: boolean}}) =>
        input.metadata.approved
            ? new Order({ ...order, state: 'PaymentSettled' })
            : { __typename: 'PaymentDeclinedError', errorCode: 'PAYMENT_DECLINED_ERROR', message: 'PAYMENT_DECLINED_ERROR' },
    );
    const transitionToState = mock.fn(async (..._args: unknown[]) => new Order({ ...order, state: 'ArrangingPayment' }));
    const findOneByCode = mock.fn(async (..._args: unknown[]) => order);

    // En el código real, el éxito de OrderService.addPaymentToOrder/transitionToState
    // se detecta con `instanceof Order`; aquí se cambia por una marca por forma para
    // que este test no tenga que construir una entidad TypeORM real.
    const orderServiceMock = { addPaymentToOrder, transitionToState, findOneByCode };
    const fakeRepository = createFakeRedsysTransactionRepository();
    const fakeAttemptRepository = createFakeAttemptRepository(order);
    const connectionMock = {
        getRepository: (_ctx: unknown, entity: unknown) =>
            entity === RedsysPaymentAttempt ? fakeAttemptRepository : fakeRepository,
        // El withTransaction real abre, confirma o deshace una transacción; el sustituto
        // solo ejecuta la función con el mismo ctx, suficiente para probar la lógica
        // del servicio (idempotencia, orden, propagación de errores).
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
    // DS_MERCHANT_ORDER es un valor nuevo por intento (no el código del pedido); ver
    // RedsysPaymentAttempt: Redsys rechaza repetir un número de pedido, así que cada
    // intento necesita uno distinto, con el formato que exige Redsys (4 numéricos +
    // 8 alfanuméricos).
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
    // El éxito de OrderService.addPaymentToOrder en Vendure es `result instanceof Order`.
    // Aquí no es fácil construir una entidad `Order` real, así que este test comprueba
    // *lo que el servicio intentó hacer*: transición y addPaymentToOrder llamados una
    // vez cada uno, con metadatos approved:true.
    const order = { id: '1', code: '0001AAAAAAAA', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, transitionToState } = createService(order);

    const body = buildNotificationBody(order.code, '0000');
    await service.handleNotification(body, FAKE_REQ);

    assert.equal(transitionToState.mock.callCount(), 0); // ya en ArrangingPayment
    assert.equal(addPaymentToOrder.mock.callCount(), 1);
    const [, , input] = addPaymentToOrder.mock.calls[0].arguments as [unknown, unknown, { metadata: { approved: boolean; responseCode: string } }];
    assert.equal(input.metadata.approved, true);
    assert.equal(input.metadata.responseCode, '0000');
});

test('handleNotification records a declined payment for a KO response, without throwing', async () => {
    // addPaymentToOrder devuelve una denegación como PaymentDeclinedError, sin lanzar
    // error: es un resultado esperado y final y debe tratarse como «gestionado
    // correctamente» (no como fallo del sistema); si no, un pedido denegado nunca se
    // marcaría como procesado y cada reintento de Redsys se volvería a procesar.
    const order = { id: '1', code: '0002BBBBBBBB', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder } = createService(order);

    const body = buildNotificationBody(order.code, '0180'); // 0180 = tarjeta denegada
    const result = await service.handleNotification(body, FAKE_REQ);

    assert.equal(result.alreadyProcessed, false);
    assert.equal(addPaymentToOrder.mock.callCount(), 1);
    const [, , input] = addPaymentToOrder.mock.calls[0].arguments as [unknown, unknown, { metadata: { approved: boolean; responseCode: string } }];
    assert.equal(input.metadata.approved, false);

    // Una notificación reintentada de la misma denegación debe reconocerse como duplicada.
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
    // Test de regresión del fallo real que esto corrige: una tarjeta denegada y luego
    // un reintento correcto del *mismo pedido* deben tratarse como intentos distintos,
    // no fusionarse por una idempotencia basada en orderCode, que descartaría en
    // silencio el reintento correcto.
    const order = { id: '1', code: '0006FFFFFFFF', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, fakeAttemptRepository } = createService(order);

    // Primer intento (denegado): merchantOrder distinto del segundo.
    const firstAttemptOrder = '0006AAAAAAAA';
    await fakeAttemptRepository.insert({ merchantOrder: firstAttemptOrder, orderCode: order.code });
    const declinedBody = buildNotificationBody(firstAttemptOrder, '0180');
    const declinedResult = await service.handleNotification(declinedBody, FAKE_REQ);
    assert.equal(declinedResult.alreadyProcessed, false);

    // Segundo intento, posterior (aprobado): otro merchantOrder, mismo pedido.
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
    // Test de regresión: una versión anterior guardaba la fila de deduplicación
    // *antes* de llamar a addPaymentToOrder, así que un fallo posterior (p. ej. una
    // transacción ausente) bloqueaba para siempre y en silencio cualquier reintento
    // de un pedido que en realidad nunca se pagó.
    const order = { id: '1', code: '0005EEEEEEEE', state: 'ArrangingPayment' };
    const { service, addPaymentToOrder, fakeRepository } = createService(order);

    addPaymentToOrder.mock.mockImplementationOnce(async () => {
        throw new Error('simulated failure, e.g. missing transaction');
    });

    const body = buildNotificationBody(order.code, '0000');
    await assert.rejects(() => service.handleNotification(body, FAKE_REQ));
    assert.equal(await fakeRepository.findOne({ where: { merchantOrder: order.code } }), null);

    // El reintento debe procesarse de nuevo, no descartarse en silencio como duplicado.
    const retry = await service.handleNotification(body, FAKE_REQ);
    assert.equal(retry.alreadyProcessed, false);
    assert.equal(addPaymentToOrder.mock.callCount(), 2);
});
