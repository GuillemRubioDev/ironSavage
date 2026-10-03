export const loggerCtx = 'RedsysPlugin';

/**
 * Código propio del PaymentMethodHandler: fijo, lo define este plugin.
 *
 * NO es lo mismo que el `code` de una entidad PaymentMethod (el identificador que
 * elige el administrador al crear el método de pago en el dashboard, y lo que
 * espera de verdad `addPaymentToOrder({method: ...})`): la tienda puede llamarlo
 * como quiera. RedsysService busca el PaymentMethod que usa este handler y usa el
 * código de *esa* entidad al registrar un pago.
 */
export const REDSYS_PAYMENT_HANDLER_CODE = 'redsys-payment-handler';

/** Comercio de pruebas público de Redsys; solo se usa como valor por defecto en .env.example. */
export const REDSYS_TEST_MERCHANT_CODE = '999008881';
export const REDSYS_TEST_TERMINAL = '1';
export const REDSYS_TEST_SECRET_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

export const REDSYS_URLS = {
    test: 'https://sis-t.redsys.es:25443/sis/realizarPago',
    production: 'https://sis.redsys.es/sis/realizarPago',
} as const;

/** Códigos numéricos ISO 4217 de las monedas que se espera que use la tienda. */
export const REDSYS_CURRENCY_NUMERIC: Record<string, string> = {
    EUR: '978',
    USD: '840',
    GBP: '826',
};

/** Ds_Merchant_TransactionType: autorización estándar. */
export const REDSYS_TRANSACTION_TYPE_AUTHORIZATION = '0';

export const REDSYS_SIGNATURE_VERSION = 'HMAC_SHA256_V1';
