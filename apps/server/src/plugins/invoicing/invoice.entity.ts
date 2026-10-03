import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

import { INVOICE_STATUSES, INVOICE_TYPES, InvoiceStatus, InvoiceType } from './constants';
import { AddressSnapshot, CustomerSnapshot, FiscalRegistrationRecord } from './types';

/**
 * One ordinary invoice per Order (enforced by the partial unique index
 * below), plus one rectifying invoice per settled refund. Customer and
 * billing-address data are stored as frozen JSON snapshots taken at issue
 * time — the invoice must stay correct even if the Customer or Order is
 * later edited, merged, or the ProductVariant is renamed/deleted.
 */
@Entity()
// Belt-and-braces alongside the atomic sequence counter in InvoiceSequence:
// even if two numbers were ever allocated concurrently, the DB itself
// refuses to let the same (series, number) pair be persisted twice.
@Index('IDX_invoice_series_number', ['series', 'number'], { unique: true })
@Index('IDX_invoice_order_ordinary', ['orderId'], { unique: true, where: `"type" = 'ORDINARY'` })
export class Invoice extends VendureEntity {
    constructor(input?: DeepPartial<Invoice>) {
        super(input);
    }

    @Index()
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

    /** ORDINARY = the order's invoice; RECTIFYING = a factura rectificativa for a refund (negative amounts). */
    @Column({ type: 'varchar', enum: INVOICE_TYPES, default: 'ORDINARY' })
    type: InvoiceType;

    /** Rectifying invoices only: the invoice they correct, and its number/date frozen for the document. */
    @EntityId({ nullable: true })
    rectifiesInvoiceId?: ID | null;

    @Column({ type: 'varchar', nullable: true })
    rectifiedInvoiceNumber?: string | null;

    @Column({ type: 'timestamp', nullable: true })
    rectifiedInvoiceDate?: Date | null;

    /** Rectifying invoices only: the Vendure Refund it documents — unique, so each refund gets exactly one. */
    @Index({ unique: true })
    @EntityId({ nullable: true })
    refundId?: ID | null;

    /** Rectifying invoices only: reason printed on the document (the refund's reason, or a default). */
    @Column({ type: 'text', nullable: true })
    reason?: string | null;

    /**
     * Result of registering the invoice with a fiscal system (Veri*Factu) through the
     * configured FiscalRegistrationProvider — null when none is configured.
     */
    @Column({ type: 'simple-json', nullable: true })
    fiscalRegistration?: FiscalRegistrationRecord | null;

    /** Relative path (under the configured pdfOutputDir) to the generated PDF, once written. */
    @Column({ nullable: true })
    pdfPath?: string;
}
