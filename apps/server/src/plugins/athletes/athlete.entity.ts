import { Customer, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, OneToMany, OneToOne } from 'typeorm';

import { AthleteCode } from './athlete-code.entity';

/**
 * Marca a un Customer como atleta. En todo lo demás sigue siendo un cliente normal
 * (inicio de sesión, carrito, checkout, pedidos, gastar puntos); esta fila solo
 * cambia cómo *gana* puntos: no por sus propias compras, sino cuando otros clientes
 * compran con uno de sus códigos. Es una entidad aparte, y no un campo
 * personalizado de Customer, para que los datos propios del atleta (códigos,
 * recompensas, notas internas) puedan crecer sin tocar la tabla de clientes.
 *
 * `enabled = false` suspende el rol de atleta (de forma reversible): sus códigos
 * dejan de aplicarse, deja de ganar recompensas y vuelve a ganar puntos normales
 * por sus compras. `deletedAt` lo quita definitivamente.
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

    /** Notas internas de administración (deporte, detalles del acuerdo…); nunca se exponen en la Shop API. */
    @Column({ type: 'text', nullable: true })
    notes: string | null;

    /**
     * Un atleta no puede existir sin su cliente. Vendure borra los clientes de forma
     * lógica (así que la cascada de la clave foránea nunca salta), por eso el rol
     * también se borra de forma lógica: cuando se borra el cliente o cuando un
     * administrador quita el rol. A la vez se desactivan sus códigos y se borran sus
     * promociones; la fila solo se conserva para que las recompensas pasadas tengan dueño.
     */
    @Column({ type: 'timestamp', nullable: true })
    deletedAt: Date | null;

    @OneToMany(() => AthleteCode, code => code.athlete)
    codes: AthleteCode[];
}
