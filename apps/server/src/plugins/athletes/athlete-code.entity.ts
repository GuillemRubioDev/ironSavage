import { DeepPartial, EntityId, ID, Promotion, VendureEntity } from '@vendure/core';
import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Athlete } from './athlete.entity';
import { ATHLETE_DISCOUNT_TYPES, ATHLETE_REWARD_TYPES, AthleteDiscountType, AthleteRewardType } from './constants';
import { decimalTransformer } from './decimal.transformer';

/**
 * A promotional code owned by an athlete, with its own, independent terms:
 * what the customer gets (discount) and what the athlete gets (reward).
 *
 * The customer-facing discount is not re-implemented here: every code is
 * backed by a regular Vendure `Promotion` (coupon code + built-in discount
 * action + the `athlete_code` condition), kept in sync by AthleteService, so
 * cart/checkout apply it through Vendure's own `applyCouponCode` flow like
 * any other coupon. This row is the source of truth for the terms; the
 * Promotion is a projection of it.
 *
 * Its own entity (not columns on Athlete) so an athlete can have more than
 * one code, e.g. per campaign, each with different terms.
 */
@Entity()
// DB-level guards mirroring validateAthleteCodeInput, so no write path can store invalid terms.
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

    /** Canonical upper-case form (see normalizeAthleteCode), so the unique index rejects case-only duplicates. */
    @Index({ unique: true })
    @Column({ length: 32 })
    code: string;

    @Column({ default: true })
    enabled: boolean;

    @Column({ type: 'varchar', enum: ATHLETE_DISCOUNT_TYPES, default: 'PERCENTAGE' })
    discountType: AthleteDiscountType;

    /** Percentage (0-100, two decimals) or a fixed amount in cents, depending on discountType. */
    @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
    discountValue: number;

    @Column({ type: 'varchar', enum: ATHLETE_REWARD_TYPES, default: 'PERCENTAGE' })
    rewardType: AthleteRewardType;

    /** Percentage (0-100, two decimals) or a fixed number of points, depending on rewardType. */
    @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimalTransformer })
    rewardValue: number;

    @Index({ unique: true })
    @EntityId({ nullable: true })
    promotionId: ID | null;

    @ManyToOne(() => Promotion, { onDelete: 'SET NULL' })
    @JoinColumn()
    promotion: Promotion | null;
}
