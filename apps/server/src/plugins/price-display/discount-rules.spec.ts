import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    applyPercentDiscount,
    CONTAINS_PRODUCTS_CONDITION,
    discountPercentFor,
    DisplayVariant,
    FACET_BASED_DISCOUNT,
    FACETS_CONDITION,
    MIN_ORDER_AMOUNT_CONDITION,
    PRODUCTS_PERCENTAGE_DISCOUNT,
    PromotionLike,
    publicPromotionFrom,
} from './discount-rules';

const NOW = new Date('2026-10-03T12:00:00Z');

function arg(name: string, value: string) {
    return { name, value };
}

function productDiscount(percent: string, variantIds: string[]) {
    return {
        code: PRODUCTS_PERCENTAGE_DISCOUNT,
        args: [arg('discount', percent), arg('productVariantIds', JSON.stringify(variantIds))],
    };
}

function facetDiscount(percent: string, facetValueIds: string[]) {
    return {
        code: FACET_BASED_DISCOUNT,
        args: [arg('discount', percent), arg('facets', JSON.stringify(facetValueIds))],
    };
}

function containsProducts(variantIds: string[], minimum = '1') {
    return {
        code: CONTAINS_PRODUCTS_CONDITION,
        args: [arg('minimum', minimum), arg('productVariantIds', JSON.stringify(variantIds))],
    };
}

function promotion(overrides: Partial<PromotionLike>): PromotionLike {
    return { couponCode: null, startsAt: null, endsAt: null, conditions: [], actions: [], ...overrides };
}

function variant(overrides: Partial<DisplayVariant> & { id: string }): DisplayVariant {
    return { facetValueIds: [], priceWithTax: 8953, price: 7400, ...overrides };
}

function publicOrFail(p: PromotionLike) {
    const parsed = publicPromotionFrom(p, NOW);
    assert.ok(parsed, 'la promoción debería poder mostrarse en ficha');
    return [parsed];
}

test('el caso típico del Dashboard (producto concreto + condición contains_products) se muestra en ficha', () => {
    const promotions = publicOrFail(
        promotion({
            conditions: [containsProducts(['38'])],
            actions: [productDiscount('20', ['38'])],
        }),
    );
    assert.equal(discountPercentFor(variant({ id: '38' }), promotions), 20);
    assert.equal(discountPercentFor(variant({ id: '39' }), promotions), 0, 'otras variantes no se descuentan');
});

test('un descuento por faceta con su condición de faceta se aplica a todos los productos de ese grupo', () => {
    const promotions = publicOrFail(
        promotion({
            conditions: [{ code: FACETS_CONDITION, args: [arg('minimum', '1'), arg('facets', JSON.stringify(['3']))] }],
            actions: [facetDiscount('15', ['3'])],
        }),
    );
    assert.equal(discountPercentFor(variant({ id: '1', facetValueIds: ['3', '9'] }), promotions), 15);
    assert.equal(discountPercentFor(variant({ id: '2', facetValueIds: ['9'] }), promotions), 0);
});

test('una condición de importe mínimo se evalúa con el precio unitario del variante', () => {
    const promotions = publicOrFail(
        promotion({
            conditions: [{ code: MIN_ORDER_AMOUNT_CONDITION, args: [arg('amount', '8000'), arg('taxInclusive', 'true')] }],
            actions: [productDiscount('10', ['38'])],
        }),
    );
    assert.equal(discountPercentFor(variant({ id: '38', priceWithTax: 8953 }), promotions), 10, 'supera el mínimo');
    assert.equal(discountPercentFor(variant({ id: '38', priceWithTax: 5000 }), promotions), 0, 'no llega al mínimo');
});

test('las promociones que no se pueden predecir sin un pedido real no se muestran en ficha', () => {
    const product = productDiscount('20', ['38']);
    assert.equal(publicPromotionFrom(promotion({ couponCode: 'VERANO', actions: [product] }), NOW), null, 'cupón');
    assert.equal(
        publicPromotionFrom(promotion({ startsAt: new Date('2026-11-01'), actions: [product] }), NOW),
        null,
        'todavía no ha empezado',
    );
    assert.equal(
        publicPromotionFrom(promotion({ endsAt: new Date('2026-09-01'), actions: [product] }), NOW),
        null,
        'ya ha terminado',
    );
    assert.equal(
        publicPromotionFrom(
            promotion({ conditions: [{ code: 'customer_group', args: [arg('customerGroupId', '2')] }], actions: [product] }),
            NOW,
        ),
        null,
        'depende del grupo de clientes',
    );
    assert.equal(
        publicPromotionFrom(
            promotion({ conditions: [containsProducts(['38'], '2')], actions: [product] }),
            NOW,
        ),
        null,
        'necesita dos unidades: no se puede mostrar con una',
    );
    assert.equal(
        publicPromotionFrom(
            promotion({
                conditions: [containsProducts(['38'])],
                actions: [{ code: 'order_percentage_discount', args: [arg('discount', '10')] }],
            }),
            NOW,
        ),
        null,
        'descuento sobre el pedido completo',
    );
});

test('varias promociones aplicables se suman en porcentaje y el total se limita a 0-100', () => {
    const promotions = [
        ...publicOrFail(promotion({ conditions: [containsProducts(['38'])], actions: [productDiscount('20', ['38'])] })),
        ...publicOrFail(promotion({ conditions: [containsProducts(['38'])], actions: [productDiscount('15', ['38'])] })),
    ];
    assert.equal(discountPercentFor(variant({ id: '38' }), promotions), 35);

    const huge = publicOrFail(promotion({ conditions: [containsProducts(['38'])], actions: [productDiscount('150', ['38'])] }));
    assert.equal(discountPercentFor(variant({ id: '38' }), huge), 100);
});

test('el precio con descuento se redondea al céntimo', () => {
    assert.equal(applyPercentDiscount(8953, 20), 7162);
    assert.equal(applyPercentDiscount(1999, 0), 1999);
    assert.equal(applyPercentDiscount(1999, 100), 0);
});
