import type { OrderCodeStrategy, RequestContext } from '@vendure/core';

import { generateRedsysOrderNumber } from './redsys-order-number';

/**
 * Redsys exige que Ds_Merchant_Order tenga entre 4 y 12 caracteres, con los 4
 * primeros numéricos (el resto puede ser alfanumérico).
 *
 * DefaultOrderCodeStrategy de Vendure genera un código de 16 caracteres que no lo
 * cumple, así que los códigos de pedido de esta tienda se generan desde el principio
 * en un formato compatible con Redsys.
 */
export class RedsysOrderCodeStrategy implements OrderCodeStrategy {
    generate(ctx: RequestContext): string {
        return generateRedsysOrderNumber();
    }
}
