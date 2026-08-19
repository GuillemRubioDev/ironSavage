import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

import { REVIEW_STATUSES, ReviewStatus } from './constants';

/**
 * One review per (customer, product, order) — a customer who bought the
 * same product in two separate orders may leave one review per purchase,
 * but never two for the same purchase (enforced by the unique index below).
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
