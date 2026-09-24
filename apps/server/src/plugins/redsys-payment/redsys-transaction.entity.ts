import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * Records every Redsys notification that has been successfully verified and
 * processed, keyed uniquely by the per-attempt Ds_Merchant_Order
 * (`merchantOrder`) — NOT the Vendure order code, since a single order can
 * have several distinct Redsys attempts (e.g. a declined card followed by a
 * successful retry), each with its own Ds_Merchant_Order. `orderCode` is
 * kept as a plain (non-unique) indexed column for lookups/audit.
 *
 * This exists purely to make notification processing idempotent at the
 * database level: Redsys retries notifications that don't get a fast enough
 * response, and this table's unique index turns a duplicate/retried
 * notification into a safe no-op instead of a second `addPaymentToOrder`
 * call. It intentionally stores no card data — only Redsys' own non-sensitive
 * response fields, for audit purposes.
 */
@Entity()
export class RedsysTransaction extends VendureEntity {
    constructor(input?: DeepPartial<RedsysTransaction>) {
        super(input);
    }

    @Index({ unique: true })
    @Column()
    merchantOrder: string;

    @Index()
    @Column()
    orderCode: string;

    @Column()
    responseCode: string;

    @Column()
    approved: boolean;

    @Column({ nullable: true })
    authorisationCode?: string;

    /** Non-sensitive Redsys response fields (no PAN/card data), for audit/debugging. */
    @Column('text')
    rawResponse: string;
}
