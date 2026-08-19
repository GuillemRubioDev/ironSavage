import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { ReviewsService } = require('./reviews.service');
const { ProductReview } = require('./product-review.entity');

function matches(row: any, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([k, v]) => String(row[k]) === String(v));
}

function createFakeDb() {
    const reviews = new Map<string, any>();
    const orders = new Map<string, any>();
    let nextReviewId = 1;

    const reviewRepo = {
        findOne: async ({ where }: { where: Record<string, unknown> }) => {
            for (const r of reviews.values()) if (matches(r, where)) return r;
            return null;
        },
        find: async ({ where }: { where: Record<string, unknown> }) => [...reviews.values()].filter(r => matches(r, where)),
        findAndCount: async ({ where, skip = 0, take = 20 }: { where: Record<string, unknown>; skip?: number; take?: number }) => {
            const all = [...reviews.values()]
                .filter(r => matches(r, where))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return [all.slice(skip, skip + take), all.length] as const;
        },
        save: async (input: any) => {
            const isNew = !input.id;
            const key = isNew ? String(nextReviewId++) : String(input.id);
            for (const r of reviews.values()) {
                if (
                    String(r.id) !== key &&
                    String(r.customerId) === String(input.customerId) &&
                    String(r.productId) === String(input.productId) &&
                    String(r.orderId) === String(input.orderId)
                ) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
            }
            const saved = { ...input, id: key, createdAt: input.createdAt ?? new Date(), updatedAt: new Date() };
            reviews.set(key, saved);
            return saved;
        },
    };

    const orderRepo = {
        findOne: async ({ where }: { where: Record<string, unknown> }) => {
            for (const o of orders.values()) if (matches(o, where)) return o;
            return null;
        },
    };

    return { reviews, orders, reviewRepo, orderRepo };
}

function createService() {
    const db = createFakeDb();
    const connectionMock = {
        getRepository: (_ctx: unknown, Entity: unknown) => (Entity === ProductReview ? db.reviewRepo : db.orderRepo),
    };
    return { service: new ReviewsService(connectionMock), db };
}

function paidOrder(overrides: Record<string, unknown> = {}) {
    return {
        id: '1',
        code: 'ORDER1',
        customerId: 'cust-1',
        lines: [{ productVariant: { productId: 'prod-1' } }],
        payments: [{ state: 'Settled' }],
        ...overrides,
    };
}

test('a customer who bought the product can create a review', async () => {
    const { service, db } = createService();
    db.orders.set('1', paidOrder());

    const result = await service.createReview({}, 'cust-1', {
        productId: 'prod-1',
        orderId: '1',
        rating: 5,
        title: 'Great product',
        comment: 'Really happy with this purchase.',
    });

    assert.equal(result.success, true);
    assert.equal(result.review.status, 'PENDING');
    assert.equal(result.review.rating, 5);
});

test('a customer who did not buy the product cannot create a review', async () => {
    const { service, db } = createService();
    db.orders.set('1', paidOrder({ customerId: 'cust-owner' }));

    const result = await service.createReview({}, 'cust-intruder', {
        productId: 'prod-1',
        orderId: '1',
        rating: 4,
        title: 'Nice',
        comment: 'Trying to review something I never bought.',
    });

    assert.equal(result.success, false);
    assert.equal(db.reviews.size, 0);
});

test('an unpaid order does not make a customer eligible to review', async () => {
    const { service, db } = createService();
    db.orders.set('1', paidOrder({ payments: [{ state: 'Cancelled' }] }));

    const result = await service.createReview({}, 'cust-1', {
        productId: 'prod-1',
        orderId: '1',
        rating: 3,
        title: 'Ok',
        comment: 'Order was never actually paid for.',
    });

    assert.equal(result.success, false);
    assert.equal(db.reviews.size, 0);
});

test("a review cannot be modified by anyone other than its own author", async () => {
    const { service, db } = createService();
    db.orders.set('1', paidOrder());
    const created = await service.createReview({}, 'cust-1', {
        productId: 'prod-1',
        orderId: '1',
        rating: 5,
        title: 'Great',
        comment: 'Loved it.',
    });
    assert.equal(created.success, true);

    const result = await service.updateReview({}, 'cust-intruder', {
        id: created.review.id,
        title: 'Hijacked title',
    });

    assert.equal(result.success, false);
    const stillOriginal = await db.reviewRepo.findOne({ where: { id: created.review.id } });
    assert.equal(stillOriginal.title, 'Great');
});

test('only APPROVED reviews are returned by the public listing; PENDING and REJECTED are not', async () => {
    const { service, db } = createService();
    db.orders.set('1', paidOrder());
    db.orders.set('2', paidOrder({ id: '2', code: 'ORDER2' }));
    db.orders.set('3', paidOrder({ id: '3', code: 'ORDER3' }));

    const pending = await service.createReview({}, 'cust-1', { productId: 'prod-1', orderId: '1', rating: 3, title: 'A', comment: 'pending review' });
    const toApprove = await service.createReview({}, 'cust-1', { productId: 'prod-1', orderId: '2', rating: 4, title: 'B', comment: 'to be approved' });
    const toReject = await service.createReview({}, 'cust-1', { productId: 'prod-1', orderId: '3', rating: 2, title: 'C', comment: 'to be rejected' });

    await service.approveReview({}, toApprove.review.id);
    await service.rejectReview({}, toReject.review.id);

    const publicList = await service.listApprovedForProduct({}, 'prod-1');

    assert.equal(publicList.totalItems, 1);
    assert.equal(publicList.items[0].id, toApprove.review.id);
    assert.notEqual(publicList.items.some((r: any) => r.id === pending.review.id), true);
    assert.notEqual(publicList.items.some((r: any) => r.id === toReject.review.id), true);
});

test('a rating outside 1-5 is rejected', async () => {
    const { service, db } = createService();
    db.orders.set('1', paidOrder());

    const tooHigh = await service.createReview({}, 'cust-1', { productId: 'prod-1', orderId: '1', rating: 6, title: 'X', comment: 'invalid rating' });
    const tooLow = await service.createReview({}, 'cust-1', { productId: 'prod-1', orderId: '1', rating: 0, title: 'X', comment: 'invalid rating' });
    const notInteger = await service.createReview({}, 'cust-1', { productId: 'prod-1', orderId: '1', rating: 3.5, title: 'X', comment: 'invalid rating' });

    assert.equal(tooHigh.success, false);
    assert.equal(tooLow.success, false);
    assert.equal(notInteger.success, false);
    assert.equal(db.reviews.size, 0);
});
