/**
 * Descuentos visibles en la ficha de producto. El precio mostrado tiene que
 * coincidir con el que cobra el carrito, así que este módulo replica lo que hace
 * el motor de promociones de Vendure para un pedido con UNA unidad del producto
 * que se está viendo.
 *
 * Acciones soportadas (las que el Dashboard ofrece para descuentos por producto o
 * por grupo):
 * - `products_percentage_discount`: porcentaje sobre variantes concretas.
 * - `facet_based_discount`: porcentaje sobre lo que tenga TODOS los valores de
 *   faceta indicados (FacetValueChecker mira el variante y su producto).
 *
 * Condiciones soportadas (Vendure exige al menos una condición o un cupón en cada
 * promoción; si la condición se cumple con una sola unidad, se muestra):
 * - `contains_products` con minimum 1 y el variante dentro de la lista.
 * - `at_least_n_with_facets` con minimum 1 y el variante con todas las facetas.
 * - `minimum_order_amount`: el precio unitario alcanza el importe mínimo.
 *
 * Una promoción con cupón, fuera de fechas, con cualquier otra condición (grupo
 * de clientes, compra X-Y, etc.) o con otra acción no se puede predecir sin un
 * pedido real: no se muestra en la ficha, aunque el carrito sí la aplique.
 *
 * Varias promociones aplicables se suman en porcentaje: Vendure calcula cada
 * acción sobre el precio original de la línea, así que no se encadenan.
 */

export const PRODUCTS_PERCENTAGE_DISCOUNT = 'products_percentage_discount';
export const FACET_BASED_DISCOUNT = 'facet_based_discount';
export const CONTAINS_PRODUCTS_CONDITION = 'contains_products';
export const FACETS_CONDITION = 'at_least_n_with_facets';
export const MIN_ORDER_AMOUNT_CONDITION = 'minimum_order_amount';

export interface ConfigArgLike {
    name: string;
    value: string;
}

export interface ConfigurableOperationLike {
    code: string;
    args: ConfigArgLike[];
}

export interface PromotionLike {
    couponCode?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    conditions: ConfigurableOperationLike[];
    actions: ConfigurableOperationLike[];
}

export type PublicDiscountRule =
    | { kind: 'variants'; percent: number; variantIds: string[] }
    | { kind: 'facets'; percent: number; facetValueIds: string[] };

export type PublicCondition =
    | { kind: 'variants'; variantIds: string[] }
    | { kind: 'facets'; facetValueIds: string[] }
    | { kind: 'minOrder'; amountCents: number; taxInclusive: boolean };

export interface PublicPromotion {
    conditions: PublicCondition[];
    rules: PublicDiscountRule[];
}

export interface DisplayVariant {
    id: string;
    /** Valores de faceta del variante y de su producto, combinados. */
    facetValueIds: string[];
    /** Precio unitario con IVA y sin IVA, en céntimos. */
    priceWithTax: number;
    price: number;
}

export function publicPromotionFrom(promotion: PromotionLike, now: Date): PublicPromotion | null {
    if (promotion.couponCode) {
        return null;
    }
    if (promotion.startsAt && promotion.startsAt > now) {
        return null;
    }
    if (promotion.endsAt && promotion.endsAt < now) {
        return null;
    }

    const conditions: PublicCondition[] = [];
    for (const condition of promotion.conditions) {
        const parsed = parseCondition(condition);
        if (!parsed) {
            return null;
        }
        conditions.push(parsed);
    }

    const rules: PublicDiscountRule[] = [];
    for (const action of promotion.actions) {
        const percent = Number.parseFloat(argValue(action, 'discount') ?? '');
        if (!Number.isFinite(percent)) {
            return null;
        }
        if (action.code === PRODUCTS_PERCENTAGE_DISCOUNT) {
            rules.push({ kind: 'variants', percent, variantIds: parseIdList(argValue(action, 'productVariantIds')) });
        } else if (action.code === FACET_BASED_DISCOUNT) {
            rules.push({ kind: 'facets', percent, facetValueIds: parseIdList(argValue(action, 'facets')) });
        } else {
            return null;
        }
    }
    return { conditions, rules };
}

export function discountPercentFor(variant: DisplayVariant, promotions: PublicPromotion[]): number {
    let total = 0;
    for (const promotion of promotions) {
        if (!promotion.conditions.every(condition => conditionHolds(condition, variant))) {
            continue;
        }
        for (const rule of promotion.rules) {
            if (ruleApplies(rule, variant)) {
                total += rule.percent;
            }
        }
    }
    return Math.min(100, Math.max(0, total));
}

export function applyPercentDiscount(priceCents: number, percent: number): number {
    return Math.round((priceCents * (100 - percent)) / 100);
}

function conditionHolds(condition: PublicCondition, variant: DisplayVariant): boolean {
    if (condition.kind === 'variants') {
        return condition.variantIds.includes(variant.id);
    }
    if (condition.kind === 'facets') {
        const variantFacetIds = variant.facetValueIds.map(String);
        return condition.facetValueIds.every(id => variantFacetIds.includes(String(id)));
    }
    const unitAmount = condition.taxInclusive ? variant.priceWithTax : variant.price;
    return unitAmount >= condition.amountCents;
}

function ruleApplies(rule: PublicDiscountRule, variant: DisplayVariant): boolean {
    if (rule.kind === 'variants') {
        return rule.variantIds.includes(variant.id);
    }
    const variantFacetIds = variant.facetValueIds.map(String);
    return rule.facetValueIds.every(id => variantFacetIds.includes(String(id)));
}

function parseCondition(operation: ConfigurableOperationLike): PublicCondition | null {
    if (operation.code === CONTAINS_PRODUCTS_CONDITION) {
        return minimumIsOne(operation) ? { kind: 'variants', variantIds: parseIdList(argValue(operation, 'productVariantIds')) } : null;
    }
    if (operation.code === FACETS_CONDITION) {
        return minimumIsOne(operation) ? { kind: 'facets', facetValueIds: parseIdList(argValue(operation, 'facets')) } : null;
    }
    if (operation.code === MIN_ORDER_AMOUNT_CONDITION) {
        const amountCents = Number.parseInt(argValue(operation, 'amount') ?? '', 10);
        if (!Number.isFinite(amountCents)) {
            return null;
        }
        const taxInclusive = (argValue(operation, 'taxInclusive') ?? '').toLowerCase() === 'true';
        return { kind: 'minOrder', amountCents, taxInclusive };
    }
    return null;
}

function minimumIsOne(operation: ConfigurableOperationLike): boolean {
    return Number.parseInt(argValue(operation, 'minimum') ?? '', 10) === 1;
}

function argValue(operation: ConfigurableOperationLike, name: string): string | undefined {
    return operation.args.find(arg => arg.name === name)?.value;
}

/** Vendure guarda las listas de IDs como un array JSON dentro de un string. */
function parseIdList(raw: string | undefined): string[] {
    if (!raw) {
        return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
}
