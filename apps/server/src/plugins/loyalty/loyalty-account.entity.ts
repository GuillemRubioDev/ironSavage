import { Customer, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';

/**
 * One account per Customer. `balance` is a denormalized running total kept in
 * sync with `LoyaltyTransaction` inside the same DB transaction as every
 * write — the transaction ledger is the audit source of truth, this column
 * exists purely so reading the current balance doesn't require summing the
 * whole ledger on every request.
 */
@Entity()
export class LoyaltyAccount extends VendureEntity {
    constructor(input?: DeepPartial<LoyaltyAccount>) {
        super(input);
    }

    @Index({ unique: true })
    @EntityId()
    customerId: ID;

    @OneToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn()
    customer: Customer;

    @Column({ default: 0 })
    balance: number;

    @Column({ default: 0 })
    lifetimeEarned: number;

    @Column({ default: 0 })
    lifetimeSpent: number;
}
