import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * Registra cada notificación de Redsys verificada y procesada correctamente, con
 * clave única por el Ds_Merchant_Order de cada intento (`merchantOrder`), NO por el
 * código de pedido de Vendure: un mismo pedido puede tener varios intentos en Redsys
 * (p. ej. una tarjeta denegada y luego un reintento correcto), cada uno con su
 * Ds_Merchant_Order. `orderCode` se guarda como columna indexada normal (no única)
 * para búsquedas y auditoría.
 *
 * Existe solo para que el procesado de notificaciones sea idempotente en la base de
 * datos: Redsys reintenta las notificaciones que no reciben respuesta rápida, y el
 * índice único de esta tabla convierte una notificación duplicada o reintentada en
 * algo inocuo en vez de una segunda llamada a `addPaymentToOrder`. A propósito no
 * guarda datos de tarjeta: solo los campos no sensibles de la respuesta de Redsys,
 * para auditoría.
 */
@Entity()
export class RedsysTransaction extends VendureEntity {
    constructor(input?: DeepPartial<RedsysTransaction>) {
        super(input);
    }

    @Index({ unique: true })
    @Column()
    merchantOrder: string;

    @Index()
    @Column()
    orderCode: string;

    @Column()
    responseCode: string;

    @Column()
    approved: boolean;

    @Column({ nullable: true })
    authorisationCode?: string;

    /** Campos no sensibles de la respuesta de Redsys (sin PAN ni datos de tarjeta), para auditoría y depuración. */
    @Column('text')
    rawResponse: string;
}
