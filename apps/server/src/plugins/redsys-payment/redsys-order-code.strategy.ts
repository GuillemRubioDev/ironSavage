import { randomInt } from 'node:crypto';
import type { OrderCodeStrategy, RequestContext } from '@vendure/core';

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Redsys requires Ds_Merchant_Order to be 4-12 characters long, with the first
 * 4 characters being numeric digits (the remainder may be alphanumeric).
 *
 * Vendure's DefaultOrderCodeStrategy generates a 16-character code that doesn't
 * satisfy this, so this store's order codes are generated in a Redsys-compatible
 * format from the start — the Order's own `code` can then be used directly as
 * Ds_Merchant_Order, with no separate mapping/lookup table needed.
 */
export class RedsysOrderCodeStrategy implements OrderCodeStrategy {
    generate(ctx: RequestContext): string {
        const digits = randomInt(0, 10_000).toString().padStart(4, '0');
        let suffix = '';
        for (let i = 0; i < 8; i++) {
            suffix += ALPHANUMERIC[randomInt(0, ALPHANUMERIC.length)];
        }
        return `${digits}${suffix}`;
    }
}
