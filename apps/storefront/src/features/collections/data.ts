import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetTopCollectionsQuery, GetAllCollectionsQuery, GetCollectionFallbackImagesQuery} from './graphql';

export async function getTopCollections(locale: string) {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-${locale}`);

    const result = await query(GetTopCollectionsQuery, undefined, {languageCode: locale});
    return result.data.collections.items;
}

export interface CollectionWithImage {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
}

// How many of a collection's products to sample when it has no featuredAsset
// of its own — small and bounded, not a full catalog scan.
const FALLBACK_SAMPLE_SIZE = 5;

/**
 * Deterministic string -> non-negative int hash (djb2 variant). Used to pick
 * a stable "representative" product per collection instead of the same one
 * every time — stable across requests/renders since it's computed once here
 * on the server from the collection's own slug, never re-picked client-side
 * (so there's no SSR/hydration mismatch to worry about).
 */
function stableHash(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 33 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/**
 * Top-level collections with a resolved display image: the collection's own
 * featuredAsset if it has one, otherwise a deterministically-chosen image
 * from a small sample of its real products, otherwise null (caller falls
 * back to a brand visual). Only issues a products query for collections that
 * actually lack an image — bounded by the (small) number of top-level
 * collections, not an N+1 over the whole catalog.
 */
export async function getTopCollectionsWithImages(locale: string): Promise<CollectionWithImage[]> {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-with-images-${locale}`);

    const collections = await getTopCollections(locale);

    return Promise.all(collections.map(async (collection): Promise<CollectionWithImage> => {
        if (collection.featuredAsset?.preview) {
            return {id: collection.id, name: collection.name, slug: collection.slug, imageUrl: collection.featuredAsset.preview};
        }

        const result = await query(GetCollectionFallbackImagesQuery, {
            input: {collectionSlug: collection.slug, groupByProduct: true, take: FALLBACK_SAMPLE_SIZE},
        }, {languageCode: locale});

        const candidates = result.data.search.items
            .map(item => item.productAsset?.preview)
            .filter((preview): preview is string => Boolean(preview));

        const imageUrl = candidates.length > 0
            ? candidates[stableHash(collection.slug) % candidates.length]
            : null;

        return {id: collection.id, name: collection.name, slug: collection.slug, imageUrl};
    }));
}

export interface CollectionSummary {
    name: string;
    slug: string;
}

/**
 * Maps collection id -> {name, slug} so product cards can show a category
 * label without an N+1 query per card (SearchResult only exposes collectionIds).
 */
export async function getCollectionsMap(locale: string): Promise<Map<string, CollectionSummary>> {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-map-${locale}`);

    const result = await query(GetAllCollectionsQuery, undefined, {languageCode: locale});
    return new Map(result.data.collections.items.map(c => [c.id, {name: c.name, slug: c.slug}]));
}
