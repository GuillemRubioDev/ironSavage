export type AppEnv = 'dev' | 'test' | 'production';

/**
 * Unset or unrecognized APP_ENV defaults to 'production' — fail closed, not
 * open. A function, not a precomputed constant: vendure-config.ts loads
 * `dotenv/config` itself, so process.env.APP_ENV isn't populated until that
 * import line runs — evaluating this at module-load time here could read an
 * empty value depending on import order.
 */
export function getAppEnv(): AppEnv {
    const value = process.env.APP_ENV;
    return value === 'dev' || value === 'test' ? value : 'production';
}

/**
 * The dummy payment handler (auto-settles, makes no real charge) must be
 * registered in vendure-config.ts's `paymentMethodHandlers` in exactly the
 * same environments where seed.ts creates a PaymentMethod row that
 * references it — otherwise that row points at an unregistered handler
 * code. Both places import this one function so they can't drift apart.
 */
export function includeDummyPaymentHandler(): boolean {
    return getAppEnv() !== 'production';
}
