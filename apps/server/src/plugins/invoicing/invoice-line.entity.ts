import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Invoice } from './invoice.entity';

/**
 * One row per Order line (plus one for shipping) at the moment of invoicing.
 * `productName`/`sku` are frozen snapshots — never joined back to Product/
 * ProductVariant — because the product may later be renamed, re-priced, or
 * deleted without affecting a previously issued invoice.
 */
@Entity()
export class InvoiceLine extends VendureEntity {
    constructor(input?: DeepPartial<InvoiceLine>) {
        super(input);
    }

    @Index()
    @EntityId()
    invoiceId: ID;

    @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
    @JoinColumn()
    invoice: Invoice;

    @Column()
    productName: string;

    @Column()
    sku: string;

    @Column()
    quantity: number;

    /** Minor units (cents), excluding tax. */
    @Column()
    unitPrice: number;

    /** Percentage, e.g. 21 for 21%. */
    @Column('float')
    taxRate: number;

    /** Minor units (cents). */
    @Column()
    taxAmount: number;

    /** Minor units (cents), including tax — quantity * unitPrice + taxAmount. */
    @Column()
    lineTotal: number;
}
