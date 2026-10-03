import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { LOYALTY_TRANSACTION_TYPES, LoyaltyTransactionType } from './constants';
import { LoyaltyAccount } from './loyalty-account.entity';

/**
 * El libro de movimientos, solo de inserción. Todo cambio de saldo debe quedar aquí:
 * es la fuente de verdad para auditoría; `LoyaltyAccount.balance` es solo una caché
 * de la suma de estas filas. `points` lleva signo: positivo en abonos EARN/REFUND y
 * ADJUSTMENT positivos, negativo en SPEND y ADJUSTMENT negativos.
 */
@Entity()
@Index(['orderId', 'type'])
// Impone en la base de datos que «un pedido genera puntos una sola vez»: un segundo
// EARN para el mismo orderId se rechaza, a salvo de carreras aunque lleguen eventos
// simultáneos. SPEND/REFUND/ADJUSTMENT pueden repetirse por pedido, así que este
// índice parcial solo afecta a type = 'EARN'.
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
