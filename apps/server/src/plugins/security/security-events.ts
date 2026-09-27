import { Logger } from '@vendure/core';

const loggerCtx = 'SecurityEvents';

export type SecurityEventType =
    | 'auth_failed'
    | 'auth_succeeded'
    | 'rate_limit_blocked'
    | 'admin_resend_invoice'
    | 'admin_adjust_loyalty_points';

/**
 * Single choke point for security-relevant logging. Deliberately takes a
 * flat, pre-vetted set of fields rather than an arbitrary object — never
 * pass `req.body`/`variables` wholesale here, since that's exactly where a
 * password or token would leak into the log.
 */
export function logSecurityEvent(
    type: SecurityEventType,
    fields: Record<string, string | number | boolean | undefined>,
): void {
    const parts = Object.entries(fields)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
    Logger.warn(`[${type}] ${parts}`, loggerCtx);
}
