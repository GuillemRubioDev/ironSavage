import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * Maps a single Redsys payment attempt's Ds_Merchant_Order back to the
 * Vendure order it belongs to.
 *
 * Redsys rejects a new authorization request that reuses an order number it
 * has already seen ("SIS0051 - Número de pedido repetido") — even if the
 * earlier attempt was declined or abandoned. So every attempt (including
 * retries of the same Vendure order after a declined card) is sent to
 * Redsys under a fresh, unique Ds_Merchant_Order, distinct from the stable
 * Vendure order code. This table is what lets the notification handler
 * resolve that per-attempt value back to the real order.
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
