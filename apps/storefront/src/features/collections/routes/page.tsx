import type { Metadata } from 'next';
import { Suspense } from 'react';
import { query } from '@/platform/vendure/api';
import {SearchProductsQuery} from '@/features/search/graphql';
import {GetCollectionProductsQuery} from '@/features/collections/graphql';
import {ProductCount} from '@/features/products/product-grid';
import {ListingHeader} from '@/features/products/listing-header';
import {CatalogResults} from '@/features/search/catalog-results';
import { buildSearchInput, getCurrentPage } from '@/features/search/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import { routing } from '@/platform/i18n/routing';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    localizedPath,
    buildOgImages,
    buildTwitterImages,
} from '@/config/metadata';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';

async function getCollectionProducts(slug: string, searchParams: { [key: string]: string | string[] | undefined }, currencyCode: string) {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    cacheTag(`collection-${slug}-${locale}-${currencyCode}`);
    cacheTag('collection');

    return query(SearchProductsQuery, {
        input: buildSearchInput({
            searchParams,
            collectionSlug: slug
        })
    }, {languageCode: locale, currencyCode});
}

async function getCollectionMetadata(slug: string) {
    'use cache';
    cacheLife('hours');

    const locale = await getRouteLocale();
    cacheTag(`collection-meta-${slug}-${locale}`);

    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 0, collectionSlug: slug, groupByProduct: true },
    }, {languageCode: locale});
}

export async function generateMetadata({
    params,
}: PageProps<'/[locale]/categorias/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getRouteLocale();
    const result = await getCollectionMetadata(slug);
    const collection = result.data.collection;

    const t = await getTranslations({locale, namespace: 'Collection'});

    if (!collection) {
        return {
            title: t('collectionNotFound'),
        };
    }

    const description =
        truncateDescription(collection.description) ||
        t('browseCollectionAt', {name: collection.name, siteName: SITE_NAME});
    const ogLocale = toOgLocale(locale);
    const collectionPath = `/categorias/${collection.slug}`;

    return {
        title: collection.name,
        description,
        alternates: {
            canonical: buildCanonicalUrl(localizedPath(locale, collectionPath)),
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, collectionPath))])
            ),
        },
        openGraph: {
            title: collection.name,
            description,
            type: 'website',
            locale: ogLocale,
            url: buildCanonicalUrl(localizedPath(locale, collectionPath)),
            images: buildOgImages(collection.featuredAsset?.preview, collection.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: collection.name,
            description,
            images: buildTwitterImages(collection.featuredAsset?.preview),
        },
    };
}

export default async function CollectionPage({params, searchParams}: PageProps<'/[locale]/categorias/[slug]'>) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Collection'});
    const page = getCurrentPage(searchParamsResolved);

    const productDataPromise = getCollectionProducts(slug, searchParamsResolved, currencyCode);
    const collectionResult = await getCollectionMetadata(slug);
    const collection = collectionResult.data.collection;
    const collectionName = collection?.name ?? slug;

    return (
        <>
            <ListingHeader
                crumbs={[{label: t('home'), href: '/'}, {label: collectionName}]}
                title={collectionName}
                watermark={collectionName.charAt(0)}
                count={<Suspense fallback={null}><ProductCount productDataPromise={productDataPromise} /></Suspense>}
            />
            <CatalogResults productDataPromise={productDataPromise} currentPage={page} />
        </>
    );
}
