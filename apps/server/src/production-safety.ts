import { Logger } from '@vendure/core';

const loggerCtx = 'ProductionSafety';

/**
 * CORS origin for the Admin + Shop APIs. In dev this stays permissive
 * (`true` — reflects any Origin), which is fine since nothing here is
 * internet-facing. In production, Vendure's own default is also `true`
 * with `credentials: true` — reflecting any Origin while allowing cookies —
 * which would let any website make credentialed requests against a signed-in
 * admin's or customer's session. CORS_ORIGIN (comma-separated) must be set
 * explicitly; STOREFRONT_URL alone is used as a sane fallback since it's
 * already a required var, but an explicit CORS_ORIGIN is recommended so the
 * admin Dashboard's own origin can be included too if it's ever served from
 * somewhere other than this same server.
 */
export function getCorsOrigin(isDev: boolean): true | string[] {
    if (isDev) {
        return true;
    }
    const explicit = process.env.CORS_ORIGIN;
    if (explicit) {
        return explicit.split(',').map(origin => origin.trim()).filter(Boolean);
    }
    if (process.env.STOREFRONT_URL) {
        return [process.env.STOREFRONT_URL.replace(/\/$/, '')];
    }
    throw new Error(
        'Refusing to start in production without a CORS origin configured. Set CORS_ORIGIN ' +
            '(comma-separated list of allowed origins) or STOREFRONT_URL.',
    );
}

/**
 * The scaffold default (`assetUrlPrefix: 'https://www.my-shop.com/assets/'`)
 * is a placeholder domain that was never updated for this project — left as
 * the production value, every asset URL returned by the API would point at
 * a domain nobody owns. Require an explicit value instead of guessing.
 */
export function getAssetUrlPrefix(isDev: boolean): string | undefined {
    if (isDev) {
        return undefined;
    }
    const prefix = process.env.ASSET_URL_PREFIX;
    if (!prefix) {
        throw new Error(
            'Refusing to start in production without ASSET_URL_PREFIX set (e.g. https://api.yourshop.com/assets/) ' +
                '— leaving this unset would serve broken image URLs pointing at the Vendure scaffold\'s placeholder domain.',
        );
    }
    return prefix;
}

/**
 * Non-fatal checks for the kind of "forgot to flip a setting" mistake that
 * silently breaks production without an obvious error: running with the
 * app in production mode but Redsys still pointed at its test endpoint, or
 * transactional email silently falling back to the dev provider (which
 * writes real customer verification/reset tokens to a local file instead of
 * emailing them). These only run outside dev and only warn — they don't
 * block startup, since a store can legitimately choose to soft-launch
 * without email configured yet, but the operator should see this loudly.
 */
export function runProductionSafetyChecks(isDev: boolean): void {
    if (isDev) {
        return;
    }
    if (process.env.REDSYS_ENVIRONMENT !== 'production') {
        Logger.warn(
            'APP_ENV is not "dev" but REDSYS_ENVIRONMENT is not "production" — payments will go through the Redsys ' +
                'TEST gateway. If this is a real production deployment, set REDSYS_ENVIRONMENT=production.',
            loggerCtx,
        );
    }
    const emailProviderConfigured =
        process.env.EMAIL_PROVIDER === 'smtp' && !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;
    if (process.env.EMAIL_ENABLED !== 'false' && !emailProviderConfigured) {
        Logger.warn(
            'APP_ENV is not "dev" but no real email provider is configured (EMAIL_PROVIDER/SMTP_* are unset or ' +
                'incomplete) — transactional emails (verification, password reset, order confirmations) will fall ' +
                'back to writing to local files instead of being delivered. Set EMAIL_PROVIDER=smtp and the SMTP_* ' +
                'vars, or set EMAIL_ENABLED=false to silence this if that is intentional.',
            loggerCtx,
        );
    }
}
