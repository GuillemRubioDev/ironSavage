import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import { Athlete } from './athlete.entity';
import { AthleteCode } from './athlete-code.entity';
import { AthleteRewardReversal } from './athlete-reward-reversal.entity';
import {
    ATHLETE_DISCOUNT_TYPES,
    ATHLETE_REWARD_STATUSES,
    ATHLETE_REWARD_TYPES,
    AthleteDiscountType,
    AthleteRewardStatus,
    AthleteRewardType,
} from './constants';
import { decimalTransformer } from './decimal.transformer';

/**
 * One reward an athlete earned from one order placed with their code. Every
 * value that went into the calculation is snapshotted here at grant time
 * (code, terms, base amount, point value), so later changes to the athlete's
 * configuration never alter historical rewards.
 *
 * The points themselves live in the loyalty ledger (`loyaltyTransactionId`
 * points to the ATHLETE_REWARD LoyaltyTransaction that credited them), so
 * the athlete spends them through the regular redemption flow; this row is
 * the "why" behind that ledger entry.
 *
 * The unique index on `orderId` is what makes granting idempotent: an order
 * can produce at most one athlete reward, no matter how many times its
 * PaymentSettled event is delivered.
 */
@Entity()
@Check(
    'CHK_athlete_reward_points',
    `"points" >= 0 AND "revertedPoints" >= 0 AND "revertedPoints" <= "points" AND "unrecoveredPoints" >= 0 AND "unrecoveredPoints" <= "revertedPoints"`,
)
@Check('CHK_athlete_reward_status', `"status" IN ('ACTIVE', 'PARTIALLY_REVERTED', 'REVERTED')`)
export class AthleteReward extends VendureEntity {
    constructor(input?: DeepPartial<AthleteReward>) {
        super(input);
    }

    @Index()
    @EntityId()
    athleteId: ID;

    @ManyToOne(() => Athlete, { onDelete: 'CASCADE' })
    @JoinColumn()
    athlete: Athlete;

    @Index()
    @EntityId({ nullable: true })
    athleteCodeId: ID | null;

    @ManyToOne(() => AthleteCode, { onDelete: 'SET NULL' })
    @JoinColumn()
    athleteCode: AthleteCode | null;

    /** Code as it was applied to the order (snapshot). */
    @Column({ length: 32 })
    code: string;

    @Index({ unique: true })
    @EntityId()
    orderId: ID;

    @Column()
    orderCode: string;

    /** The customer who placed the order. Admin-only — never exposed to the athlete. */
    @EntityId({ nullable: true })
    customerId: ID | null;

    /** Monetary base the reward was computed on, in minor units (order subTotalWithTax: products after discounts, with tax, excluding shipping). */
    @Column()
    baseAmount: number;

    /** Discount the customer received from this code on the order, in minor units (positive number). */
    @Column({ default: 0 })
    customerDiscountAmount: number;

    @Column({ length: 3 })
    currencyCode: string;

    @Column({ type: 'varchar', enum: ATHLETE_DISCOUNT_TYPES })
    discountType: AthleteDiscountType;

    @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
    discountValue: number;

    @Column({ type: 'varchar', enum: ATHLETE_REWARD_TYPES })
    rewardType: AthleteRewardType;

    @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
    rewardValue: number;

    /** Loyalty program point value at grant time. */
    @Column()
    pointValueInCents: number;

    /** Points granted. */
    @Column()
    points: number;

    /** Points reverted so far (cancellations, refunds, manual reversals) — as decided, regardless of balance. */
    @Column({ default: 0 })
    revertedPoints: number;

    /** Part of revertedPoints that couldn't be debited because the athlete had already spent them. */
    @Column({ default: 0 })
    unrecoveredPoints: number;

    @Column({ type: 'varchar', enum: ATHLETE_REWARD_STATUSES, default: 'ACTIVE' })
    status: AthleteRewardStatus;

    @EntityId({ nullable: true })
    loyaltyTransactionId: ID | null;

    @OneToMany(() => AthleteRewardReversal, reversal => reversal.reward)
    reversals: AthleteRewardReversal[];
}
