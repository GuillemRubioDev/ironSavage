import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * One row per series, holding the last-issued number. Incremented via a
 * single atomic `UPDATE ... SET "lastNumber" = "lastNumber" + 1 ... RETURNING`
 * (see InvoicingService.allocateNextNumber) so Postgres' own row lock
 * serializes concurrent invoice generation — no gaps, no duplicates, no
 * read-then-write race, without needing an application-level lock.
 */
@Entity()
export class InvoiceSequence extends VendureEntity {
    constructor(input?: DeepPartial<InvoiceSequence>) {
        super(input);
    }

    @Index({ unique: true })
    @Column()
    series: string;

    @Column({ default: 0 })
    lastNumber: number;
}
