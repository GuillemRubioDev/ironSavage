import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

import { REVIEW_STATUSES, ReviewStatus } from './constants';

/**
 * Una reseña por (cliente, producto, pedido): quien compró el mismo producto en dos
 * pedidos puede dejar una reseña por compra, pero nunca dos de la misma compra (lo
 * impone el índice único de abajo).
 */
@Entity()
@Index('IDX_review_customer_product_order', ['customerId', 'productId', 'orderId'], { unique: true })
export class ProductReview extends VendureEntity {
    constructor(input?: DeepPartial<ProductReview>) {
        super(input);
    }

    @Index()
    @EntityId()
    productId: ID;

    @Index()
    @EntityId()
    customerId: ID;

    @EntityId()
    orderId: ID;

    @Column()
    rating: number;

    @Column()
    title: string;

    @Column('text')
    comment: string;

    @Index()
    @Column({ type: 'varchar', enum: REVIEW_STATUSES, default: 'PENDING' })
    status: ReviewStatus;
}
