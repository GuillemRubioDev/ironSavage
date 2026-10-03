import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * Registro, solo de inserción, de cada intento de envío: sirve para «registrar
 * errores de envío» y para no duplicar los emails de un pedido (un pedido debe
 * recibir como mucho un email de «pago confirmado» aunque el evento PaymentSettled
 * llegara dos veces). Los emails de registro, verificación y restablecimiento de
 * contraseña no tienen orderId, así que el índice único parcial de abajo solo afecta
 * a los tipos de pedido (order-received/payment-confirmed/order-cancelled/
 * invoice-available): un cliente que pide con razón un segundo email de
 * restablecimiento debe recibirlo. 'invoice-resend' también se excluye a propósito:
 * que un administrador reenvíe una factura ya generada (p. ej. a otra dirección)
 * debe poder repetirse, no deduplicarse como los envíos automáticos.
 */
@Entity()
@Index('IDX_email_log_type_order_unique', ['type', 'orderId'], {
    unique: true,
    where: `"orderId" IS NOT NULL AND "success" = true AND "type" != 'invoice-resend'`,
})
export class EmailLog extends VendureEntity {
    constructor(input?: DeepPartial<EmailLog>) {
        super(input);
    }

    @Column()
    type: string;

    @Column()
    recipient: string;

    @Index()
    @EntityId({ nullable: true })
    orderId?: ID;

    @Column()
    success: boolean;

    @Column({ type: 'text', nullable: true })
    error?: string;

    @Column()
    provider: string;
}
