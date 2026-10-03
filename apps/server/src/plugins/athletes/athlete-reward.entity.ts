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
 * Una recompensa que ganó un atleta por un pedido hecho con su código. Todos los
 * valores del cálculo se copian aquí al concederla (código, condiciones, base,
 * valor del punto), para que los cambios posteriores en la configuración del
 * atleta nunca alteren las recompensas pasadas.
 *
 * Los puntos en sí están en el libro de fidelización (`loyaltyTransactionId`
 * apunta a la LoyaltyTransaction ATHLETE_REWARD que los abonó), así que el atleta
 * los gasta con el flujo de canje normal; esta fila es el «porqué» de ese apunte.
 *
 * El índice único sobre `orderId` es lo que hace idempotente la concesión: un
 * pedido genera como mucho una recompensa de atleta, por muchas veces que llegue
 * su evento PaymentSettled.
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

    /** Código tal como se aplicó al pedido (copia). */
    @Column({ length: 32 })
    code: string;

    @Index({ unique: true })
    @EntityId()
    orderId: ID;

    @Column()
    orderCode: string;

    /** El cliente que hizo el pedido. Solo para administración: nunca se muestra al atleta. */
    @EntityId({ nullable: true })
    customerId: ID | null;

    /** Base sobre la que se calculó la recompensa, en céntimos (subTotalWithTax del pedido: productos tras descuentos, con IVA, sin envío). */
    @Column()
    baseAmount: number;

    /** Descuento que recibió el cliente por este código en el pedido, en céntimos (número positivo). */
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

    /** Valor del punto del programa de fidelización al concederla. */
    @Column()
    pointValueInCents: number;

    /** Puntos concedidos. */
    @Column()
    points: number;

    /** Puntos revertidos hasta ahora (cancelaciones, reembolsos, reversiones manuales), según lo decidido, haya saldo o no. */
    @Column({ default: 0 })
    revertedPoints: number;

    /** Parte de revertedPoints que no se pudo descontar porque el atleta ya los había gastado. */
    @Column({ default: 0 })
    unrecoveredPoints: number;

    @Column({ type: 'varchar', enum: ATHLETE_REWARD_STATUSES, default: 'ACTIVE' })
    status: AthleteRewardStatus;

    @EntityId({ nullable: true })
    loyaltyTransactionId: ID | null;

    @OneToMany(() => AthleteRewardReversal, reversal => reversal.reward)
    reversals: AthleteRewardReversal[];
}
