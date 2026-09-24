import { randomInt } from 'node:crypto';

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates a fresh value satisfying Redsys' Ds_Merchant_Order format: 4-12
 * characters, the first 4 numeric, the rest alphanumeric.
 *
 * Used both for the Vendure order code itself (RedsysOrderCodeStrategy) and
 * for the per-attempt Ds_Merchant_Order values in RedsysService — Redsys
 * rejects ("SIS0051 - Número de pedido repetido") a new authorization
 * request that reuses an order number it has already seen that day, even if
 * the earlier attempt was declined, so a retried payment needs a new value
 * distinct from both the Vendure order code and any earlier attempt.
 */
export function generateRedsysOrderNumber(): string {
    const digits = randomInt(0, 10_000).toString().padStart(4, '0');
    let suffix = '';
    for (let i = 0; i < 8; i++) {
        suffix += ALPHANUMERIC[randomInt(0, ALPHANUMERIC.length)];
    }
    return `${digits}${suffix}`;
}
