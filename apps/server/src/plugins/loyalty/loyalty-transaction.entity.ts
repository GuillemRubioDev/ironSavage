import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { LOYALTY_TRANSACTION_TYPES, LoyaltyTransactionType } from './constants';
import { LoyaltyAccount } from './loyalty-account.entity';

/**
 * The append-only ledger. Every balance change must be recorded here — this
 * is the audit source of truth; `LoyaltyAccount.balance` is only a cache of
 * summing these rows. `points` is signed: positive for EARN/REFUND credits
 * and positive ADJUSTMENTs, negative for SPEND and negative ADJUSTMENTs.
 */
@Entity()
@Index(['orderId', 'type'])
// Enforces "an order generates points only once" at the DB level: a second
// EARN insert for the same orderId is rejected outright, race-safe even
// under concurrent event delivery. SPEND/REFUND/ADJUSTMENT can repeat per
// order, so this partial index only targets type = 'EARN'.
@Index('IDX_loyalty_transaction_earn_per_order', ['orderId'], { unique: true, where: `"type" = 'EARN'` })
export class LoyaltyTransaction extends VendureEntity {
    constructor(input?: DeepPartial<LoyaltyTransaction>) {
        super(input);
    }

    @Index()
    @EntityId()
    accountId: ID;

    @ManyToOne(() => LoyaltyAccount, { onDelete: 'CASCADE' })
    @JoinColumn()
    account: LoyaltyAccount;

    @Column({ type: 'varchar', enum: LOYALTY_TRANSACTION_TYPES })
    type: LoyaltyTransactionType;

    @Column()
    points: number;

    @EntityId({ nullable: true })
    orderId?: ID;

    @Column()
    description: string;
}
