import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AthleteReward } from './athlete-reward.entity';
import { ATHLETE_REVERSAL_REASONS, AthleteReversalReason } from './constants';

/**
 * One reversal applied to an AthleteReward (order cancelled, a refund
 * settled, or a manual admin reversal). Kept as its own rows rather than
 * just decrementing a counter, so the reward's full history is auditable.
 *
 * The two partial unique indexes make reversals idempotent: a given refund
 * can revert a reward only once, and so can the order's cancellation, even
 * if the triggering event is delivered more than once.
 */
@Entity()
@Check('CHK_athlete_reward_reversal_points', `"points" > 0 AND "debitedPoints" >= 0 AND "debitedPoints" <= "points"`)
@Check('CHK_athlete_reward_reversal_reason', `"reason" IN ('ORDER_CANCELLED', 'REFUND', 'MANUAL')`)
@Index('IDX_athlete_reward_reversal_refund', ['rewardId', 'refundId'], { unique: true, where: `"refundId" IS NOT NULL` })
@Index('IDX_athlete_reward_reversal_cancel', ['rewardId'], { unique: true, where: `"reason" = 'ORDER_CANCELLED'` })
export class AthleteRewardReversal extends VendureEntity {
    constructor(input?: DeepPartial<AthleteRewardReversal>) {
        super(input);
    }

    @Index()
    @EntityId()
    rewardId: ID;

    @ManyToOne(() => AthleteReward, reward => reward.reversals, { onDelete: 'CASCADE' })
    @JoinColumn()
    reward: AthleteReward;

    @Column({ type: 'varchar', enum: ATHLETE_REVERSAL_REASONS })
    reason: AthleteReversalReason;

    @EntityId({ nullable: true })
    refundId: ID | null;

    /** Points this reversal takes back from the reward. */
    @Column()
    points: number;

    /** Points actually debited from the athlete's balance (less than `points` if they had already been spent). */
    @Column()
    debitedPoints: number;

    @EntityId({ nullable: true })
    loyaltyTransactionId: ID | null;

    @Column({ type: 'varchar', nullable: true })
    note: string | null;

    /** Administrator who triggered a MANUAL reversal. */
    @EntityId({ nullable: true })
    administratorUserId: ID | null;
}
