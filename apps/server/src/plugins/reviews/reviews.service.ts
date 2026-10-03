import { Injectable } from '@nestjs/common';
import { ID, Logger, Order, PaginatedList, RequestContext, TransactionalConnection } from '@vendure/core';
import { Brackets } from 'typeorm';

import { loggerCtx, MAX_RATING, MIN_RATING, PAID_PAYMENT_STATE } from './constants';
import { ProductReview } from './product-review.entity';

export interface CreateReviewInput {
    productId: ID;
    orderId: ID;
    rating: number;
    title: string;
    comment: string;
}

export interface UpdateReviewInput {
    id: ID;
    rating?: number;
    title?: string;
    comment?: string;
}

export type ReviewMutationResult =
    | { success: true; review: ProductReview }
    | { success: false; reason: string };

@Injectable()
export class ReviewsService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Crea una reseña. Los requisitos (sesión iniciada, comprado, pedido pagado de
     * verdad, sin duplicado) se vuelven a comprobar aquí contra la base de datos. El
     * `customerId` debe venir de la sesión, nunca del navegador, y todo lo demás sobre
     * «¿está permitido?» se verifica en el servidor diga lo que diga el cliente.
     */
    async createReview(ctx: RequestContext, customerId: ID, input: CreateReviewInput): Promise<ReviewMutationResult> {
        const ratingError = this.validateRating(input.rating);
        if (ratingError) {
            return { success: false, reason: ratingError };
        }
        if (!input.title?.trim() || !input.comment?.trim()) {
            return { success: false, reason: 'Title and comment are required' };
        }

        const eligible = await this.assertPurchased(ctx, customerId, input.productId, input.orderId);
        if (!eligible.success) {
            return eligible;
        }

        const repo = this.connection.getRepository(ctx, ProductReview);
        const existing = await repo.findOne({ where: { customerId, productId: input.productId, orderId: input.orderId } });
        if (existing) {
            return { success: false, reason: 'You have already reviewed this product for this order' };
        }

        try {
            const review = await repo.save(
                new ProductReview({
                    productId: input.productId,
                    orderId: input.orderId,
                    customerId,
                    rating: input.rating,
                    title: input.title.trim(),
                    comment: input.comment.trim(),
                    status: 'PENDING',
                }),
            );
            Logger.info(`Created review ${review.id} for product ${input.productId} by customer ${customerId}`, loggerCtx);
            return { success: true, review };
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                return { success: false, reason: 'You have already reviewed this product for this order' };
            }
            throw err;
        }
    }

    /**
     * Una reseña solo puede editarla su autor, y solo mientras está PENDING: una vez
     * moderada, queda bloqueada (regla 5: no se edita tras aprobar/rechazar; regla 7:
     * nunca la reseña de otro cliente).
     */
    async updateReview(ctx: RequestContext, customerId: ID, input: UpdateReviewInput): Promise<ReviewMutationResult> {
        if (input.rating !== undefined) {
            const ratingError = this.validateRating(input.rating);
            if (ratingError) {
                return { success: false, reason: ratingError };
            }
        }

        const repo = this.connection.getRepository(ctx, ProductReview);
        const review = await repo.findOne({ where: { id: input.id } });
        if (!review || String(review.customerId) !== String(customerId)) {
            // El mismo mensaje tanto si la reseña no existe como si es de otro:
            // distinguirlos permitiría a un cliente enumerar ids de reseñas.
            return { success: false, reason: 'Review not found' };
        }
        if (review.status !== 'PENDING') {
            return { success: false, reason: 'Only a pending review can be edited' };
        }

        if (input.rating !== undefined) review.rating = input.rating;
        if (input.title !== undefined) review.title = input.title.trim();
        if (input.comment !== undefined) review.comment = input.comment.trim();
        const saved = await repo.save(review);
        return { success: true, review: saved };
    }

    async approveReview(ctx: RequestContext, id: ID): Promise<ProductReview | null> {
        return this.setStatus(ctx, id, 'APPROVED');
    }

    async rejectReview(ctx: RequestContext, id: ID): Promise<ProductReview | null> {
        return this.setStatus(ctx, id, 'REJECTED');
    }

    private async setStatus(ctx: RequestContext, id: ID, status: 'APPROVED' | 'REJECTED'): Promise<ProductReview | null> {
        const repo = this.connection.getRepository(ctx, ProductReview);
        const review = await repo.findOne({ where: { id } });
        if (!review) {
            return null;
        }
        review.status = status;
        const saved = await repo.save(review);
        Logger.info(`Review ${id} ${status.toLowerCase()}`, loggerCtx);
        return saved;
    }

    /** Público: solo devuelve reseñas APPROVED (regla 4). */
    async listApprovedForProduct(
        ctx: RequestContext,
        productId: ID,
        options?: { skip?: number; take?: number },
    ): Promise<PaginatedList<ProductReview>> {
        const [items, totalItems] = await this.connection.getRepository(ctx, ProductReview).findAndCount({
            where: { productId, status: 'APPROVED' },
            order: { createdAt: 'DESC' },
            skip: options?.skip ?? 0,
            take: options?.take ?? 20,
        });
        return { items, totalItems };
    }

    async getSummaryForProduct(ctx: RequestContext, productId: ID): Promise<{ averageRating: number; reviewCount: number }> {
        const { avg, count } = await this.connection
            .getRepository(ctx, ProductReview)
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'avg')
            .addSelect('COUNT(review.id)', 'count')
            .where('review.productId = :productId', { productId })
            .andWhere('review.status = :status', { status: 'APPROVED' })
            .getRawOne();
        return {
            averageRating: avg ? Math.round(Number(avg) * 10) / 10 : 0,
            reviewCount: Number(count ?? 0),
        };
    }

    /**
     * Los pedidos del cliente (comprobados contra la base de datos) que le permiten
     * reseñar este producto y aún no tienen reseña: lo que usa el storefront para
     * decidir si muestra el formulario de reseña y para qué compra.
     */
    async listReviewableOrdersForProduct(
        ctx: RequestContext,
        customerId: ID,
        productId: ID,
    ): Promise<Array<{ orderId: ID; orderCode: string }>> {
        const orders = await this.connection.getRepository(ctx, Order).find({
            where: { customerId },
            relations: { lines: { productVariant: true }, payments: true },
        });

        const purchasedOrders = orders.filter(
            order =>
                order.lines.some(line => String(line.productVariant.productId) === String(productId)) &&
                order.payments?.some(payment => payment.state === PAID_PAYMENT_STATE),
        );
        if (purchasedOrders.length === 0) {
            return [];
        }

        const reviewedOrderIds = new Set(
            (
                await this.connection
                    .getRepository(ctx, ProductReview)
                    .find({ where: { customerId, productId }, select: { orderId: true } })
            ).map(r => String(r.orderId)),
        );

        return purchasedOrders
            .filter(order => !reviewedOrderIds.has(String(order.id)))
            .map(order => ({ orderId: order.id, orderCode: order.code }));
    }

    async listForAdmin(
        ctx: RequestContext,
        options?: {
            skip?: number;
            take?: number;
            filter?: { status?: { eq?: string }; productSearch?: { contains?: string } };
            sort?: { createdAt?: 'ASC' | 'DESC'; rating?: 'ASC' | 'DESC' };
        },
    ): Promise<PaginatedList<ProductReview>> {
        const qb = this.connection
            .getRepository(ctx, ProductReview)
            .createQueryBuilder('review')
            .skip(options?.skip ?? 0)
            .take(options?.take ?? 50);

        if (options?.sort?.rating) {
            qb.orderBy('review.rating', options.sort.rating);
        }
        if (options?.sort?.createdAt) {
            qb.addOrderBy('review.createdAt', options.sort.createdAt);
        } else if (!options?.sort?.rating) {
            qb.orderBy('review.createdAt', 'DESC');
        }

        const statusFilter = options?.filter?.status?.eq;
        if (statusFilter) {
            qb.andWhere('review.status = :status', { status: statusFilter });
        }
        const productSearch = options?.filter?.productSearch?.contains;
        if (productSearch) {
            // product_translation es donde Vendure guarda los campos traducibles de
            // Product (incluido el nombre); se cruza con SQL directo porque ProductReview
            // no tiene relación ORM con Product (a propósito: las reseñas solo guardan el
            // productId, nunca una relación, para ser un plugin añadido limpio).
            qb.andWhere(
                new Brackets(sub => {
                    sub.where(
                        `EXISTS (SELECT 1 FROM product_translation pt WHERE pt."baseId" = review."productId" AND pt.name ILIKE :search)`,
                        { search: `%${productSearch}%` },
                    );
                }),
            );
        }

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    async findById(ctx: RequestContext, id: ID): Promise<ProductReview | null> {
        return (await this.connection.getRepository(ctx, ProductReview).findOne({ where: { id } })) ?? null;
    }

    private async assertPurchased(
        ctx: RequestContext,
        customerId: ID,
        productId: ID,
        orderId: ID,
    ): Promise<{ success: true } | { success: false; reason: string }> {
        const order = await this.connection.getRepository(ctx, Order).findOne({
            where: { id: orderId, customerId },
            relations: { lines: { productVariant: true }, payments: true },
        });
        if (!order) {
            return { success: false, reason: 'Order not found for this customer' };
        }
        const boughtThisProduct = order.lines.some(line => String(line.productVariant.productId) === String(productId));
        if (!boughtThisProduct) {
            return { success: false, reason: 'This product was not purchased in this order' };
        }
        const wasPaid = order.payments?.some(payment => payment.state === PAID_PAYMENT_STATE);
        if (!wasPaid) {
            return { success: false, reason: 'This order has not been paid' };
        }
        return { success: true };
    }

    private validateRating(rating: number): string | null {
        if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
            return `Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`;
        }
        return null;
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}
