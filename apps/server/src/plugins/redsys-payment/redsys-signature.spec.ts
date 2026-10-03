import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    decodeMerchantParameters,
    encodeMerchantParameters,
    signMerchantParameters,
    verifyMerchantParametersSignature,
} from './redsys-signature';

// Credenciales de pruebas públicas de Redsys (ver la documentación de redsys.es).
const TEST_SECRET_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';
const TEST_ORDER = '1234ABCD5678';

// Vector de referencia calculado de forma independiente con la librería `redsys-easy`
// (github.com/javiertury/redsys-easy), mantenida activamente, con las mismas
// entradas. Si algún día deja de coincidir, el fallo casi seguro está en este
// archivo, no en la referencia.
const REFERENCE_PARAMS = {
    DS_MERCHANT_AMOUNT: '145',
    DS_MERCHANT_ORDER: TEST_ORDER,
    DS_MERCHANT_MERCHANTCODE: '999008881',
    DS_MERCHANT_CURRENCY: '978',
    DS_MERCHANT_TRANSACTIONTYPE: '0',
    DS_MERCHANT_TERMINAL: '1',
    DS_MERCHANT_MERCHANTURL: 'http://localhost:3000/payments/redsys/notify',
    DS_MERCHANT_URLOK: 'http://localhost:3001/order-confirmation/1234ABCD5678',
    DS_MERCHANT_URLKO: 'http://localhost:3001/checkout?redsys=declined',
};
const REFERENCE_MERCHANT_PARAMETERS =
    'eyJEU19NRVJDSEFOVF9BTU9VTlQiOiIxNDUiLCJEU19NRVJDSEFOVF9PUkRFUiI6IjEyMzRBQkNENTY3OCIsIkRTX01FUkNIQU5UX01FUkNIQU5UQ09ERSI6Ijk5OTAwODg4MSIsIkRTX01FUkNIQU5UX0NVUlJFTkNZIjoiOTc4IiwiRFNfTUVSQ0hBTlRfVFJBTlNBQ1RJT05UWVBFIjoiMCIsIkRTX01FUkNIQU5UX1RFUk1JTkFMIjoiMSIsIkRTX01FUkNIQU5UX01FUkNIQU5UVVJMIjoiaHR0cDovL2xvY2FsaG9zdDozMDAwL3BheW1lbnRzL3JlZHN5cy9ub3RpZnkiLCJEU19NRVJDSEFOVF9VUkxPSyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMS9vcmRlci1jb25maXJtYXRpb24vMTIzNEFCQ0Q1Njc4IiwiRFNfTUVSQ0hBTlRfVVJMS08iOiJodHRwOi8vbG9jYWxob3N0OjMwMDEvY2hlY2tvdXQ/cmVkc3lzPWRlY2xpbmVkIn0=';
const REFERENCE_SIGNATURE = 'kaDVKHug7Y0kYto0TtY/yzWi2FQck73Fu+PlhgBBAYU=';

test('encodeMerchantParameters matches an independently computed reference vector', () => {
    assert.equal(encodeMerchantParameters(REFERENCE_PARAMS), REFERENCE_MERCHANT_PARAMETERS);
});

test('signMerchantParameters matches an independently computed reference signature', () => {
    const signature = signMerchantParameters(TEST_SECRET_KEY, TEST_ORDER, REFERENCE_MERCHANT_PARAMETERS);
    assert.equal(signature, REFERENCE_SIGNATURE);
});

test('verifyMerchantParametersSignature accepts the reference signature', () => {
    const valid = verifyMerchantParametersSignature(
        TEST_SECRET_KEY,
        TEST_ORDER,
        REFERENCE_MERCHANT_PARAMETERS,
        REFERENCE_SIGNATURE,
    );
    assert.equal(valid, true);
});

test('verifyMerchantParametersSignature rejects a tampered Ds_MerchantParameters', () => {
    const tamperedParams = encodeMerchantParameters({ ...REFERENCE_PARAMS, DS_MERCHANT_AMOUNT: '999999' });
    const valid = verifyMerchantParametersSignature(TEST_SECRET_KEY, TEST_ORDER, tamperedParams, REFERENCE_SIGNATURE);
    assert.equal(valid, false);
});

test('verifyMerchantParametersSignature rejects a tampered signature', () => {
    const tamperedSignature = 'kaDVKHug7Y0kYto0TtY/yzWi2FQck73Fu+PlhgBBAY0=';
    const valid = verifyMerchantParametersSignature(
        TEST_SECRET_KEY,
        TEST_ORDER,
        REFERENCE_MERCHANT_PARAMETERS,
        tamperedSignature,
    );
    assert.equal(valid, false);
});

test('verifyMerchantParametersSignature rejects a signature computed for a different order', () => {
    // Mismos parámetros y firma, pero verificados con otro número de pedido, lo que
    // cambia la clave 3DES derivada: simula a un atacante reutilizando la firma de un
    // pedido en otro.
    const valid = verifyMerchantParametersSignature(
        TEST_SECRET_KEY,
        '9999ZZZZ0000',
        REFERENCE_MERCHANT_PARAMETERS,
        REFERENCE_SIGNATURE,
    );
    assert.equal(valid, false);
});

test('verifyMerchantParametersSignature does not throw on garbage input', () => {
    assert.doesNotThrow(() => verifyMerchantParametersSignature(TEST_SECRET_KEY, TEST_ORDER, 'not-base64!!', 'also-not-base64!!'));
    assert.equal(verifyMerchantParametersSignature(TEST_SECRET_KEY, TEST_ORDER, 'not-base64!!', 'also-not-base64!!'), false);
});

test('encodeMerchantParameters / decodeMerchantParameters round-trip', () => {
    const decoded = decodeMerchantParameters(REFERENCE_MERCHANT_PARAMETERS);
    assert.deepEqual(decoded, REFERENCE_PARAMS);
});
