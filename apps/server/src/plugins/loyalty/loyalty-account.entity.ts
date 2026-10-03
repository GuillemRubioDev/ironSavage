import { Customer, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';

/**
 * Una cuenta por cliente. `balance` es un total acumulado desnormalizado que se
 * mantiene sincronizado con `LoyaltyTransaction` dentro de la misma transacción de
 * cada escritura. La fuente de verdad para auditoría es el libro de movimientos;
 * esta columna existe solo para no sumar todo el libro en cada petición.
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
