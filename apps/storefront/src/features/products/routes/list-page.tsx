import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Link } from '@/platform/i18n/navigation';
import { query } from '@/platform/vendure/api';
import { SearchProductsQuery } from '@/features/search/graphql';
import { ProductGrid } from '@/features/products/product-grid';
import { ProductGridSkeleton } from '@/features/products/product-grid-skeleton';
import { buildSearchInput, getCurrentPage } from '@/features/search/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
        <div className="container mx-auto px-4 py-8">
            <Breadcrumb className="mb-6">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink render={<Link href="/" />}>{t('home')}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t('allProducts')}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="mb-8">
                <h1 className="text-display text-3xl md:text-4xl font-bold">{t('allProducts')}</h1>
            </div>

            <Suspense fallback={<ProductGridSkeleton />}>
                <ProductGrid productDataPromise={productDataPromise} currentPage={page} take={12} />
            </Suspense>
        </div>
    );
}
