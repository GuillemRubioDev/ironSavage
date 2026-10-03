import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AthleteReward } from './athlete-reward.entity';
import { ATHLETE_REVERSAL_REASONS, AthleteReversalReason } from './constants';

/**
 * Una reversión aplicada a un AthleteReward (pedido cancelado, reembolso
 * liquidado o reversión manual de un administrador). Se guarda en filas propias,
 * en vez de solo restar de un contador, para poder auditar todo el historial.
 *
 * Los dos índices únicos parciales hacen las reversiones idempotentes: un mismo
 * reembolso solo puede revertir una recompensa una vez, y lo mismo la cancelación
 * del pedido, aunque el evento que lo provoca llegue más de una vez.
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

    /** Puntos que esta reversión retira de la recompensa. */
    @Column()
    points: number;

    /** Puntos realmente descontados del saldo del atleta (menos que `points` si ya los había gastado). */
    @Column()
    debitedPoints: number;

    @EntityId({ nullable: true })
    loyaltyTransactionId: ID | null;

    @Column({ type: 'varchar', nullable: true })
    note: string | null;

    /** Administrador que hizo una reversión MANUAL. */
    @EntityId({ nullable: true })
    administratorUserId: ID | null;
}
