import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

import { INVOICE_STATUSES, InvoiceStatus } from './constants';
import { AddressSnapshot, CustomerSnapshot } from './types';

/**
 * One invoice per Order (enforced by the unique index below). Customer and
 * billing-address data are stored as frozen JSON snapshots taken at issue
 * time — the invoice must stay correct even if the Customer or Order is
 * later edited, merged, or the ProductVariant is renamed/deleted.
 */
@Entity()
// Belt-and-braces alongside the atomic sequence counter in InvoiceSequence:
// even if two numbers were ever allocated concurrently, the DB itself
// refuses to let the same (series, number) pair be persisted twice.
@Index('IDX_invoice_series_number', ['series', 'number'], { unique: true })
export class Invoice extends VendureEntity {
    constructor(input?: DeepPartial<Invoice>) {
        super(input);
    }

    @Index({ unique: true })
    @EntityId()
    orderId: ID;

    /** Snapshot of the Order's own code, so it can be displayed/searched without a join. */
    @Column()
    orderCode: string;

    /** Kept as a plain (non-FK) id for authorization checks — see types.ts CustomerSnapshot for the frozen display data. */
    @Index()
    @EntityId()
    customerId: ID;

    @Column()
    series: string;

    @Column()
    number: number;

    @Column()
    issueDate: Date;

    @Column('simple-json')
    customerSnapshot: CustomerSnapshot;

    @Column('simple-json')
    billingAddressSnapshot: AddressSnapshot;

    /** All monetary columns are integer minor units (cents), matching Vendure's own Money convention. */
    @Column()
    subtotal: number;

    @Column()
    tax: number;

    @Column()
    total: number;

    @Column({ default: 'EUR' })
    currencyCode: string;

    @Column({ type: 'varchar', enum: INVOICE_STATUSES, default: 'ISSUED' })
    status: InvoiceStatus;

    /** Relative path (under the configured pdfOutputDir) to the generated PDF, once written. */
    @Column({ nullable: true })
    pdfPath?: string;
}
