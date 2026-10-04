import type { Metadata } from 'next';
import { Suspense } from 'react';
import { query } from '@/platform/vendure/api';
import { SearchProductsQuery } from '@/features/search/graphql';
import { ProductCount } from '@/features/products/product-grid';
import { ListingHeader } from '@/features/products/listing-header';
import { CatalogResults } from '@/features/search/catalog-results';
import { buildSearchInput, getCurrentPage } from '@/features/search/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import { DEFAULT_OG_IMAGES, SITE_NAME, buildCanonicalUrl, localizedPath } from '@/config/metadata';
import { getActiveCurrencyCode } from '@/features/currency/currency-server';
import { getRouteLocale } from '@/platform/i18n/server';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/platform/i18n/routing';
import { toOgLocale } from '@/platform/i18n/locale-utils';

async function getAllProducts(searchParams: { [key: string]: string | string[] | undefined }, currencyCode: string) {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    cacheTag(`products-list-${locale}-${currencyCode}`);
    cacheTag('products');

    return query(SearchProductsQuery, {
        input: buildSearchInput({ searchParams }),
    }, { languageCode: locale, currencyCode });
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({ locale, namespace: 'Product' });
    const description = t('allProductsDescription', { siteName: SITE_NAME });
    const ogLocale = toOgLocale(locale);

    return {
        title: t('allProducts'),
        description,
        alternates: {
            canonical: buildCanonicalUrl(localizedPath(locale, '/productos')),
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/productos'))])
            ),
        },
        openGraph: {
            title: t('allProducts'),
            description,
            type: 'website',
            locale: ogLocale,
            url: buildCanonicalUrl(localizedPath(locale, '/productos')),
            images: DEFAULT_OG_IMAGES,
        },
    };
}

export default async function ProductListPage({ searchParams }: PageProps<'/[locale]/productos'>) {
    const searchParamsResolved = await searchParams;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({ locale, namespace: 'Product' });
    const page = getCurrentPage(searchParamsResolved);

    const productDataPromise = getAllProducts(searchParamsResolved, currencyCode);

    return (
        <>
            <ListingHeader
                crumbs={[{label: t('home'), href: '/'}, {label: t('allProducts')}]}
                title={t('allProducts')}
                watermark="P"
                count={<Suspense fallback={null}><ProductCount productDataPromise={productDataPromise} /></Suspense>}
            />
            <CatalogResults productDataPromise={productDataPromise} currentPage={page} />
        </>
    );
}
