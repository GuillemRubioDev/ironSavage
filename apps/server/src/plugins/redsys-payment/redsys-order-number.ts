import { randomInt } from 'node:crypto';

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Genera un valor nuevo con el formato Ds_Merchant_Order de Redsys: de 4 a 12
 * caracteres, los 4 primeros numéricos y el resto alfanuméricos.
 *
 * Se usa tanto para el código de pedido de Vendure (RedsysOrderCodeStrategy) como
 * para el Ds_Merchant_Order de cada intento en RedsysService: Redsys rechaza
 * («SIS0051 - Número de pedido repetido») una nueva autorización que reutiliza un
 * número de pedido ya visto ese día, aunque el intento anterior se denegara, así que
 * un pago reintentado necesita un valor distinto del código del pedido y de
 * cualquier intento anterior.
 */
export function generateRedsysOrderNumber(): string {
    const digits = randomInt(0, 10_000).toString().padStart(4, '0');
    let suffix = '';
    for (let i = 0; i < 8; i++) {
        suffix += ALPHANUMERIC[randomInt(0, ALPHANUMERIC.length)];
    }
    return `${digits}${suffix}`;
}
