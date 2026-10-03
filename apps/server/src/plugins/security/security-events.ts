import { Logger } from '@vendure/core';

const loggerCtx = 'SecurityEvents';

export type SecurityEventType =
    | 'auth_failed'
    | 'auth_succeeded'
    | 'rate_limit_blocked'
    | 'admin_resend_invoice'
    | 'admin_adjust_loyalty_points'
    | 'admin_athlete_change'
    | 'admin_revert_athlete_reward'
    | 'admin_customer_account_action';

/**
 * Punto único para el log de seguridad. A propósito recibe un conjunto plano de
 * campos ya revisados y no un objeto cualquiera: nunca pases aquí `req.body` ni
 * `variables` enteros, porque es justo por donde se filtraría al log una contraseña
 * o un token.
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
