import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetProductDetailQuery} from '@/features/products/graphql';
import {getDisplayOptionGroups} from '@/features/products/product-options';

export interface QuickAddVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    discountedPriceWithTax: number;
    stockLevel: string;
    imageUrl: string | null;
    options: Array<{id: string; groupId: string}>;
}

export interface QuickAddProduct {
    name: string;
    slug: string;
    imageUrl: string | null;
    optionGroups: Array<{id: string; name: string; options: Array<{id: string; name: string}>}>;
    variants: QuickAddVariant[];
}

/**
 * Datos mínimos del selector rápido de las tarjetas. Usa la misma consulta y las
 * mismas etiquetas de caché que la ficha, así que se revalida con ella. Devuelve null
 * si el producto ya no existe, está desactivado u oculto en la tienda.
 */
export async function loadQuickAddProduct(slug: string, locale: string, currencyCode: string): Promise<QuickAddProduct | null> {
    'use cache';
    cacheLife('hours');
    cacheTag(`product-${slug}-${locale}-${currencyCode}`);
    cacheTag('products');

    const {data} = await query(GetProductDetailQuery, {slug}, {languageCode: locale, currencyCode});
    const product = data.product;
    if (!product || !product.enabled || product.customFields?.visibleInStorefront === false) return null;

    return {
        name: product.name,
        slug: product.slug,
        imageUrl: product.assets[0]?.preview ?? null,
        optionGroups: getDisplayOptionGroups(product).map(group => ({
            id: group.id,
            name: group.name,
            options: group.options.map(option => ({id: option.id, name: option.name})),
        })),
        variants: product.variants.map(variant => ({
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            priceWithTax: variant.priceWithTax,
            discountedPriceWithTax: variant.discountedPriceWithTax,
            stockLevel: variant.stockLevel,
            imageUrl: variant.featuredAsset?.preview ?? null,
            options: variant.options.map(option => ({id: option.id, groupId: option.groupId})),
        })),
    };
}
