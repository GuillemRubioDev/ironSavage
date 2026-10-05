'use server';

import {cacheLife, cacheTag} from 'next/cache';
import {getLocale} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {readFragment} from '@/platform/vendure/graphql';
import {GetActiveOrderQuery} from '@/features/cart/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {GetProductDetailQuery, ProductCardFragment} from '@/features/products/graphql';
import {filterVisibleProducts} from '@/features/products/visibility';
import {SearchProductsQuery} from '@/features/search/graphql';

type Related = Array<{slug: string; name: string; imageUrl: string | null; price: number; currencyCode: string}>;

/** "Combínalo con": productos visibles de la categoría principal del producto añadido. */
async function loadRelated(slug: string, locale: string, currencyCode: string): Promise<Related> {
    'use cache';
    cacheLife('hours');
    cacheTag(`related-products-${slug}-${locale}-${currencyCode}`);
    cacheTag('products');

    const {data} = await query(GetProductDetailQuery, {slug}, {languageCode: locale, currencyCode});
    const collections = data.product?.collections ?? [];
    const primary = collections.find(c => c.parent?.id) ?? collections[0];
    if (!primary) return [];
    const result = await query(SearchProductsQuery, {
        input: {collectionSlug: primary.slug, take: 8, skip: 0, groupByProduct: true},
    }, {languageCode: locale, currencyCode});
    const visible = await filterVisibleProducts(result.data.search.items);
    return visible
        .map(item => readFragment(ProductCardFragment, item))
        .filter(item => item.slug !== slug)
        .slice(0, 3)
        .map(item => ({
            slug: item.slug,
            name: item.productName,
            imageUrl: item.productAsset?.preview ?? null,
            price: item.discountedPriceWithTax.min,
            currencyCode: item.currencyCode,
        }));
}

/**
 * Datos del panel lateral tras añadir: el pedido activo (sin caché, es del cliente),
 * la línea del producto añadido y los productos para combinar. null si algo falla:
 * el producto ya está en el carrito y el panel muestra igualmente "Ver carrito".
 */
export async function getCartDrawerData(slug: string) {
    try {
        const [locale, currencyCode] = await Promise.all([getLocale(), getActiveCurrencyCode()]);
        const [{data}, related] = await Promise.all([
            query(GetActiveOrderQuery, {}, {useAuthToken: true, languageCode: locale, currencyCode}),
            loadRelated(slug, locale, currencyCode).catch(() => [] as Related),
        ]);
        const order = data.activeOrder;
        const line = order?.lines.find(l => l.productVariant.product.slug === slug) ?? null;
        return {
            order: order ? {
                totalQuantity: order.totalQuantity,
                subTotalWithTax: order.subTotalWithTax,
                currencyCode: order.currencyCode,
                line: line ? {
                    name: line.productVariant.product.name,
                    variantName: line.productVariant.name,
                    quantity: line.quantity,
                    imageUrl: line.productVariant.product.featuredAsset?.preview ?? null,
                    linePrice: line.discountedLinePriceWithTax,
                } : null,
            } : null,
            related: related.filter(r => !order?.lines.some(l => l.productVariant.product.slug === r.slug)),
        };
    } catch {
        return null;
    }
}
