import { REDSYS_URLS } from './constants';
import type { RedsysConfig } from './types';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`[RedsysPlugin] Missing required environment variable: ${name}`);
    }
    return value;
}

let cached: RedsysConfig | undefined;

/** Reads and validates the Redsys env vars. Secrets never leave process.env. */
export function getRedsysConfig(): RedsysConfig {
    if (cached) return cached;

    const environment = process.env.REDSYS_ENVIRONMENT === 'production' ? 'production' : 'test';

    cached = {
        merchantCode: requireEnv('REDSYS_MERCHANT_CODE'),
        terminal: requireEnv('REDSYS_TERMINAL'),
        secretKey: requireEnv('REDSYS_SECRET_KEY'),
        environment,
        notificationUrl: requireEnv('REDSYS_NOTIFICATION_URL'),
        storefrontUrl: requireEnv('STOREFRONT_URL').replace(/\/$/, ''),
    };
    return cached;
}

export function getRedsysRedirectUrl(): string {
    return REDSYS_URLS[getRedsysConfig().environment];
}
