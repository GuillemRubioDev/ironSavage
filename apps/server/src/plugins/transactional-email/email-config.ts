import path from 'path';
import { Logger } from '@vendure/core';

import { loggerCtx } from './constants';
import type { EmailConfig, EmailProviderKind } from './types';

let cached: EmailConfig | undefined;

/** Secrets (SMTP credentials) are read directly from process.env and never cached anywhere but here. */
export function getEmailConfig(): EmailConfig {
    if (cached) return cached;

    const provider: EmailProviderKind = process.env.EMAIL_PROVIDER === 'smtp' ? 'smtp' : 'dev';
    const enabled = process.env.EMAIL_ENABLED !== 'false';

    if (provider === 'smtp' && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD)) {
        Logger.warn(
            'EMAIL_PROVIDER=smtp but SMTP_HOST/SMTP_USER/SMTP_PASSWORD are not fully set — falling back to the dev provider.',
            loggerCtx,
        );
    }

    const smtpConfigured =
        provider === 'smtp' && !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASSWORD;

    cached = {
        enabled,
        provider: smtpConfigured ? 'smtp' : 'dev',
        fromAddress: process.env.EMAIL_FROM ?? 'Iron Savage <no-reply@example.com>',
        replyTo: process.env.EMAIL_REPLY_TO || undefined,
        // Brand name customers see in emails ("Bienvenido/a a Iron Savage") — not the
        // registered company name, which only belongs on invoices.
        storeName: process.env.EMAIL_STORE_NAME || process.env.INVOICE_STORE_NAME || 'Iron Savage',
        storefrontUrl: (process.env.STOREFRONT_URL ?? 'http://localhost:3001').replace(/\/$/, ''),
        devOutputDir: path.join(__dirname, '../../../static/transactional-emails'),
        smtp: smtpConfigured
            ? {
                  host: process.env.SMTP_HOST!,
                  port: Number(process.env.SMTP_PORT ?? 587),
                  secure: process.env.SMTP_SECURE === 'true',
                  user: process.env.SMTP_USER,
                  password: process.env.SMTP_PASSWORD,
              }
            : undefined,
    };

    if (!enabled) {
        Logger.info('EMAIL_ENABLED=false — no transactional emails will be sent or logged as sent.', loggerCtx);
    }

    return cached;
}
