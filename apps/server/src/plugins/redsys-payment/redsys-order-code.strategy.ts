import type { OrderCodeStrategy, RequestContext } from '@vendure/core';

import { generateRedsysOrderNumber } from './redsys-order-number';

/**
 * Redsys requires Ds_Merchant_Order to be 4-12 characters long, with the first
 * 4 characters being numeric digits (the remainder may be alphanumeric).
 *
 * Vendure's DefaultOrderCodeStrategy generates a 16-character code that doesn't
 * satisfy this, so this store's order codes are generated in a Redsys-compatible
 * format from the start.
 */
export class RedsysOrderCodeStrategy implements OrderCodeStrategy {
    generate(ctx: RequestContext): string {
        return generateRedsysOrderNumber();
    }
}
