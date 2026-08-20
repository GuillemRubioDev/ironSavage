import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * An append-only record of every send attempt — both to satisfy "registrar
 * errores de envío" and to dedup order-scoped emails (an order should get at
 * most one "payment confirmed" email even if the PaymentSettled event were
 * ever redelivered). Registration/verification/password-reset emails have no
 * orderId, so the partial unique index below only constrains the order-scoped
 * types (order-received/payment-confirmed/order-cancelled/invoice-available)
 * — a customer legitimately requesting a second password-reset email should
 * still get one.
 */
@Entity()
@Index('IDX_email_log_type_order_unique', ['type', 'orderId'], { unique: true, where: `"orderId" IS NOT NULL AND "success" = true` })
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
