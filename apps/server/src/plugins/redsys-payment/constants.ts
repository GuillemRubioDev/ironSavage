export const loggerCtx = 'RedsysPlugin';

/**
 * The PaymentMethodHandler's own code — fixed, defined by this plugin.
 *
 * This is NOT the same as a PaymentMethod entity's `code` (the identifier an
 * admin chooses when creating a PaymentMethod in the Admin UI, and what
 * `addPaymentToOrder({method: ...})` actually expects) — a store could name
 * that entity anything. RedsysService looks up the PaymentMethod entity that
 * uses this handler, and uses *that* entity's own code when recording a payment.
 */
export const REDSYS_PAYMENT_HANDLER_CODE = 'redsys-payment-handler';

/** Redsys' publicly documented sandbox merchant, used only as a .env.example default. */
export const REDSYS_TEST_MERCHANT_CODE = '999008881';
export const REDSYS_TEST_TERMINAL = '1';
export const REDSYS_TEST_SECRET_KEY = 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

export const REDSYS_URLS = {
    test: 'https://sis-t.redsys.es:25443/sis/realizarPago',
    production: 'https://sis.redsys.es/sis/realizarPago',
} as const;

/** ISO 4217 numeric currency codes for the currencies this store is expected to use. */
export const REDSYS_CURRENCY_NUMERIC: Record<string, string> = {
    EUR: '978',
    USD: '840',
    GBP: '826',
};

/** Ds_Merchant_TransactionType: standard authorization. */
export const REDSYS_TRANSACTION_TYPE_AUTHORIZATION = '0';

export const REDSYS_SIGNATURE_VERSION = 'HMAC_SHA256_V1';
