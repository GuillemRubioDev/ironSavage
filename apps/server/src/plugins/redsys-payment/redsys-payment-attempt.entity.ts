import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * Relaciona el Ds_Merchant_Order de un intento de pago en Redsys con el pedido de
 * Vendure al que pertenece.
 *
 * Redsys rechaza una nueva autorización que reutiliza un número de pedido ya visto
 * («SIS0051 - Número de pedido repetido»), aunque el intento anterior se denegara o
 * se abandonara. Por eso cada intento (incluidos los reintentos del mismo pedido tras
 * una tarjeta denegada) se envía a Redsys con un Ds_Merchant_Order nuevo y único,
 * distinto del código estable del pedido. Esta tabla permite a la notificación
 * traducir ese valor de cada intento al pedido real.
 */
@Entity()
export class RedsysPaymentAttempt extends VendureEntity {
    constructor(input?: DeepPartial<RedsysPaymentAttempt>) {
        super(input);
    }

    @Index({ unique: true })
    @Column()
    merchantOrder: string;

    @Index()
    @Column()
    orderCode: string;
}
