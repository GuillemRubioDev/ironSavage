import { DeepPartial, EntityId, ID, Promotion, VendureEntity } from '@vendure/core';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Athlete } from './athlete.entity';
import { ATHLETE_DISCOUNT_TYPES, ATHLETE_REWARD_TYPES, AthleteDiscountType, AthleteRewardType } from './constants';
import { decimalTransformer } from './decimal.transformer';

/**
 * Código promocional de un atleta, con sus propias condiciones independientes:
 * qué recibe el cliente (descuento) y qué recibe el atleta (recompensa).
 *
 * El descuento del cliente no se reimplementa aquí: cada código tiene detrás una
 * `Promotion` normal de Vendure (código de cupón + acción de descuento estándar +
 * la condición `athlete_code`), que AthleteService mantiene sincronizada, así que
 * el carrito y el checkout la aplican con el flujo `applyCouponCode` de Vendure
 * como cualquier cupón. Esta fila es la fuente de verdad de las condiciones; la
 * Promotion es un reflejo de ella.
 *
 * Es una entidad propia (y no columnas de Athlete) para que un atleta pueda tener
 * varios códigos, p. ej. uno por campaña, cada uno con sus condiciones.
 */
@Entity()
// Restricciones en la base de datos equivalentes a validateAthleteCodeInput, para que ninguna vía de escritura guarde condiciones inválidas.
@Check('CHK_athlete_code_canonical', `"code" = UPPER("code")`)
@Check('CHK_athlete_code_types', `"discountType" IN ('PERCENTAGE', 'FIXED_AMOUNT') AND "rewardType" IN ('PERCENTAGE', 'FIXED_POINTS')`)
@Check(
    'CHK_athlete_code_values',
    `"discountValue" >= 0 AND "rewardValue" >= 0 AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100) AND ("rewardType" <> 'PERCENTAGE' OR "rewardValue" <= 100)`,
)
export class AthleteCode extends VendureEntity {
    constructor(input?: DeepPartial<AthleteCode>) {
        super(input);
    }

    @Index()
    @EntityId()
    athleteId: ID;

    @ManyToOne(() => Athlete, athlete => athlete.codes, { onDelete: 'CASCADE' })
    @JoinColumn()
    athlete: Athlete;

    /** Forma canónica en mayúsculas (ver normalizeAthleteCode), para que el índice único rechace duplicados que solo cambian mayúsculas/minúsculas. */
    @Index({ unique: true })
    @Column({ length: 32 })
    code: string;

    @Column({ default: true })
    enabled: boolean;

    @Column({ type: 'varchar', enum: ATHLETE_DISCOUNT_TYPES, default: 'PERCENTAGE' })
    discountType: AthleteDiscountType;

    /** Porcentaje (0-100, dos decimales) o importe fijo en céntimos, según discountType. */
    @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
    discountValue: number;

    @Column({ type: 'varchar', enum: ATHLETE_REWARD_TYPES, default: 'PERCENTAGE' })
    rewardType: AthleteRewardType;

    /** Porcentaje (0-100, dos decimales) o número fijo de puntos, según rewardType. */
    @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
    rewardValue: number;

    @Index({ unique: true })
    @EntityId({ nullable: true })
    promotionId: ID | null;

    @ManyToOne(() => Promotion, { onDelete: 'SET NULL' })
    @JoinColumn()
    promotion: Promotion | null;
}
