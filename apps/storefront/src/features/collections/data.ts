import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetTopCollectionsQuery, GetAllCollectionsQuery} from './graphql';

export async function getTopCollections(locale: string) {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-${locale}`);

    const result = await query(GetTopCollectionsQuery, undefined, {languageCode: locale});
    return result.data.collections.items;
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
