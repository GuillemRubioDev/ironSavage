import {
    CollectionService,
    Facet,
    FacetService,
    FacetValueService,
    ID,
    LanguageCode,
    Logger,
    ProductService,
    RequestContext,
} from '@vendure/core';

const loggerCtx = 'Seed';

/**
 * Navegación por objetivos de la tienda ("¿Cuál es tu objetivo?"), igual que las
 * categorías: una faceta "Objetivo" con un valor por objetivo y una colección por
 * valor que recoge los productos marcados con él. Para añadir un producto nuevo a
 * un objetivo basta con marcarle el valor de la faceta en el dashboard.
 *
 * Las colecciones cuelgan de "Objetivos", que es PRIVADA: así no aparece en el
 * menú ni en la fila de categorías (el storefront lista las colecciones de primer
 * nivel), pero cada objetivo sí es público y tiene su página /categorias/<slug>.
 *
 * Nombres pensados para navegar, no como declaraciones de propiedades: se evitan
 * "Salud" o "Perder grasa", que pueden leerse como alegaciones de salud (Reg. (CE)
 * 1924/2006). Se pueden renombrar en el dashboard sin tocar el código.
 */
export const GOAL_FACET_CODE = 'objetivo-tienda';
const GOALS_PARENT_SLUG = 'objetivos';

const GOALS: ReadonlyArray<{code: string; slug: string; es: string; en: string}> = [
    {code: 'ganar-musculo', slug: 'objetivo-ganar-musculo', es: 'Ganar músculo', en: 'Build muscle'},
    {code: 'definicion', slug: 'objetivo-definicion', es: 'Definición', en: 'Get lean'},
    {code: 'rendimiento', slug: 'objetivo-rendimiento', es: 'Rendimiento', en: 'Performance'},
    {code: 'recuperacion', slug: 'objetivo-recuperacion', es: 'Recuperación', en: 'Recovery'},
    {code: 'bienestar', slug: 'objetivo-bienestar', es: 'Bienestar', en: 'Wellbeing'},
];

/**
 * Objetivos iniciales de los productos que existen hoy (por slug). Solo se aplica
 * a productos que todavía no tienen ningún objetivo: si un administrador ya los ha
 * cambiado en el dashboard, el seed no los toca. Los slugs que no existan en el
 * servidor se ignoran.
 */
const INITIAL_PRODUCT_GOALS: Record<string, string[]> = {
    'iso-savage': ['ganar-musculo', 'definicion', 'recuperacion'],
    'whey-savage': ['ganar-musculo', 'recuperacion'],
    'iron-creatine': ['rendimiento', 'ganar-musculo'],
    'iron-maps': ['rendimiento', 'recuperacion'],
    'iron-glutamine': ['recuperacion', 'bienestar'],
};

async function ensureGoalFacet(ctx: RequestContext, facetService: FacetService, facetValueService: FacetValueService): Promise<Map<string, ID>> {
    let facet: Facet | undefined = await facetService.findByCode(ctx, GOAL_FACET_CODE, LanguageCode.es);
    if (!facet) {
        facet = await facetService.create(ctx, {
            code: GOAL_FACET_CODE,
            isPrivate: false,
            translations: [
                {languageCode: LanguageCode.es, name: 'Objetivo'},
                {languageCode: LanguageCode.en, name: 'Goal'},
            ],
        });
        Logger.info(`Created facet "${GOAL_FACET_CODE}".`, loggerCtx);
    } else {
        Logger.info(`Facet "${GOAL_FACET_CODE}" already exists — reusing.`, loggerCtx);
    }

    const valueIds = new Map<string, ID>();
    const existing = await facetValueService.findByFacetId(ctx, facet.id);
    for (const goal of GOALS) {
        const found = existing.find(v => v.code === goal.code);
        if (found) {
            valueIds.set(goal.code, found.id);
            continue;
        }
        const created = await facetValueService.create(ctx, facet, {
            code: goal.code,
            translations: [
                {languageCode: LanguageCode.es, name: goal.es},
                {languageCode: LanguageCode.en, name: goal.en},
            ],
        });
        valueIds.set(goal.code, created.id);
        Logger.info(`Created goal "${goal.es}".`, loggerCtx);
    }
    return valueIds;
}

async function ensureGoalCollections(ctx: RequestContext, collectionService: CollectionService, valueIds: Map<string, ID>): Promise<void> {
    let parent = await collectionService.findOneBySlug(ctx, GOALS_PARENT_SLUG);
    if (!parent) {
        parent = await collectionService.create(ctx, {
            isPrivate: true,
            filters: [],
            translations: [
                {languageCode: LanguageCode.es, name: 'Objetivos', slug: GOALS_PARENT_SLUG, description: ''},
                {languageCode: LanguageCode.en, name: 'Goals', slug: GOALS_PARENT_SLUG, description: ''},
            ],
        });
        Logger.info('Created private collection "Objetivos".', loggerCtx);
    }

    for (const goal of GOALS) {
        if (await collectionService.findOneBySlug(ctx, goal.slug)) {
            Logger.info(`Collection "${goal.es}" already exists — reusing.`, loggerCtx);
            continue;
        }
        await collectionService.create(ctx, {
            parentId: parent.id,
            isPrivate: false,
            inheritFilters: false,
            filters: [
                {
                    code: 'facet-value-filter',
                    arguments: [
                        {name: 'facetValueIds', value: JSON.stringify([String(valueIds.get(goal.code))])},
                        {name: 'containsAny', value: 'false'},
                        {name: 'combineWithAnd', value: 'true'},
                    ],
                },
            ],
            translations: [
                {languageCode: LanguageCode.es, name: goal.es, slug: goal.slug, description: ''},
                {languageCode: LanguageCode.en, name: goal.en, slug: goal.slug, description: ''},
            ],
        });
        Logger.info(`Created collection "${goal.es}".`, loggerCtx);
    }
}

async function assignInitialGoals(ctx: RequestContext, productService: ProductService, valueIds: Map<string, ID>): Promise<void> {
    for (const [slug, goals] of Object.entries(INITIAL_PRODUCT_GOALS)) {
        const product = await productService.findOneBySlug(ctx, slug, ['facetValues', 'facetValues.facet']);
        if (!product) {
            Logger.info(`Product "${slug}" not found — skipping its goals.`, loggerCtx);
            continue;
        }
        if (product.facetValues.some(fv => fv.facet?.code === GOAL_FACET_CODE)) {
            Logger.info(`Product "${slug}" already has goals — leaving them as they are.`, loggerCtx);
            continue;
        }
        const goalIds = goals.map(code => valueIds.get(code)).filter((id): id is ID => id !== undefined);
        await productService.update(ctx, {
            id: product.id,
            facetValueIds: [...product.facetValues.map(fv => fv.id), ...goalIds],
        });
        Logger.info(`Assigned goals to "${slug}": ${goals.join(', ')}.`, loggerCtx);
    }
}

/** Faceta, colecciones y objetivos iniciales. Idempotente, como el resto del seed. */
export async function ensureGoals(
    ctx: RequestContext,
    services: {facetService: FacetService; facetValueService: FacetValueService; collectionService: CollectionService; productService: ProductService},
): Promise<void> {
    const valueIds = await ensureGoalFacet(ctx, services.facetService, services.facetValueService);
    await ensureGoalCollections(ctx, services.collectionService, valueIds);
    await assignInitialGoals(ctx, services.productService, valueIds);
}
