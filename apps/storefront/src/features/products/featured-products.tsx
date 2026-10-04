import {ProductCarousel} from "@/features/products/components/product-carousel";
import {getRouteLocale} from "@/platform/i18n/server";
import {cacheLife, cacheTag} from "next/cache";
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {query} from "@/platform/vendure/api";
import {SearchProductsQuery} from '@/features/search/graphql';
import {filterVisibleProducts} from '@/features/products/visibility';
import {getTranslations} from 'next-intl/server';

async function getFeaturedProducts(currencyCode: string) {
    'use cache'
    cacheLife('days')

    const locale = await getRouteLocale();
    cacheTag(`featured-${locale}-${currencyCode}`);
    cacheTag('products');

    const result = await query(SearchProductsQuery, {
        input: {
            take: 12,
            skip: 0,
            groupByProduct: true,
            sort: {name: 'ASC'},
        }
    }, {languageCode: locale, currencyCode});

    return filterVisibleProducts(result.data.search.items);
}


export async function FeaturedProducts() {
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Product'});
    const products = await getFeaturedProducts(currencyCode);

    if (!products.length) {
        return null;
    }

    return (
        <ProductCarousel
            title={t('featuredProducts')}
            highlight={t('featuredHighlight')}
            action={{href: '/productos', label: t('viewAllProducts')}}
            products={products}
        />
    )
}
