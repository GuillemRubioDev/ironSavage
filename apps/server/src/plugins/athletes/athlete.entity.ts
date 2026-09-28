import { Customer, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';

import { AthleteCode } from './athlete-code.entity';

/**
 * Marks a Customer as an athlete. An athlete is still a regular Customer in
 * every other respect (login, cart, checkout, orders, spending points) — this
 * row only changes how they *earn* points: not on their own purchases, but
 * when other customers buy with one of their codes. A separate entity rather
 * than a custom field on Customer, so athlete-specific data (codes, rewards,
 * admin notes) can grow without touching the core Customer table.
 *
 * `enabled = false` suspends the athlete role (reversibly): their codes stop
 * applying, they stop earning rewards, and they go back to earning regular
 * customer points on their own purchases. `deletedAt` removes it for good.
 */
@Entity()
export class Athlete extends VendureEntity {
    constructor(input?: DeepPartial<Athlete>) {
        super(input);
    }

    @Index({ unique: true })
    @EntityId()
    customerId: ID;

    @OneToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn()
    customer: Customer;

    @Column({ default: true })
    enabled: boolean;

    /** Internal admin notes (sport, agreement details...) — never exposed via the Shop API. */
    @Column({ type: 'text', nullable: true })
    notes: string | null;

    /**
     * An athlete can't outlive its customer. Vendure soft-deletes customers
     * (so the FK cascade never fires), which is why the role is soft-deleted
     * too — when the customer is deleted, or when an admin removes the role.
     * Its codes are disabled and their promotions deleted at the same time;
     * the row stays only so historical rewards keep their owner.
     */
    @Column({ type: 'timestamp', nullable: true })
    deletedAt: Date | null;

    @OneToMany(() => AthleteCode, code => code.athlete)
    codes: AthleteCode[];
}
