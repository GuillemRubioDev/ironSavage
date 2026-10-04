import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetTopCollectionsQuery, GetAllCollectionsQuery, GetCollectionFallbackImagesQuery} from './graphql';

export async function getTopCollections(locale: string) {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-${locale}`);
    cacheTag('collections');

    const result = await query(GetTopCollectionsQuery, undefined, {languageCode: locale});
    return result.data.collections.items;
}

export interface CollectionWithImage {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
}

// Cuántos productos de una colección se miran cuando no tiene featuredAsset propio:
// pocos y acotados, no un recorrido por todo el catálogo.
const FALLBACK_SAMPLE_SIZE = 5;

/**
 * Hash determinista de texto a entero no negativo (variante de djb2). Sirve para
 * elegir un producto «representativo» estable por colección en vez de siempre el
 * mismo. Es estable entre peticiones porque se calcula una vez aquí, en el servidor,
 * a partir del slug de la colección, y nunca se vuelve a elegir en el navegador (así
 * no hay desajustes entre SSR e hidratación).
 */
function stableHash(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 33 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/**
 * Colecciones de primer nivel con su imagen resuelta: el featuredAsset de la
 * colección si lo tiene; si no, una imagen elegida de forma determinista entre unos
 * pocos de sus productos reales; si no, null (quien llama usa una imagen de marca).
 * Solo consulta productos de las colecciones que no tienen imagen, así que está
 * acotado por el (pequeño) número de colecciones de primer nivel, no es un N+1
 * sobre todo el catálogo.
 */
export async function getTopCollectionsWithImages(locale: string): Promise<CollectionWithImage[]> {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-with-images-${locale}`);
    cacheTag('collections');

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
    /** Categoría principal (cuelga de la raíz), no un objetivo ni una subcolección. */
    isCategory: boolean;
}

/**
 * Relaciona id de colección -> {name, slug} para que las tarjetas de producto
 * muestren la categoría sin una consulta por tarjeta (SearchResult solo expone
 * collectionIds).
 */
export async function getCollectionsMap(locale: string): Promise<Map<string, CollectionSummary>> {
    'use cache';
    cacheLife('days');
    cacheTag(`collections-map-${locale}`);
    cacheTag('collections');

    const result = await query(GetAllCollectionsQuery, undefined, {languageCode: locale});
    // "1" es la colección raíz de Vendure, como en GetTopCollectionsQuery.
    return new Map(result.data.collections.items.map(c => [c.id, {name: c.name, slug: c.slug, isCategory: c.parentId === '1'}]));
}
