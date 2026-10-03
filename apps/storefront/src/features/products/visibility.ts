import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {graphql, readFragment, type FragmentOf} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';

// La Shop API de Vendure limita las listas a 100 elementos (apiOptions.shopListQueryLimit).
const HiddenProductIdsQuery = graphql(`
    query HiddenProductIds {
        products(options: { take: 100, filter: { visibleInStorefront: { eq: false } } }) {
            items {
                id
            }
        }
    }
`);

/**
 * Product.customFields.visibleInStorefront permite que un producto siga activo y
 * gestionable pero oculto en los listados de la tienda. El índice de búsqueda de
 * Vendure (que alimenta las rejillas de productos) no expone campos personalizados,
 * así que aquí se obtienen aparte los ids ocultos y se filtran después.
 */
async function getHiddenProductIds(): Promise<Set<string>> {
    'use cache';
    cacheLife('minutes');
    cacheTag('products');

    const result = await query(HiddenProductIdsQuery);
    return new Set(result.data.products.items.map(item => item.id));
}

export async function filterVisibleProducts<T extends FragmentOf<typeof ProductCardFragment>>(
    items: readonly T[],
): Promise<T[]> {
    const hiddenIds = await getHiddenProductIds();
    if (hiddenIds.size === 0) return [...items];

    return items.filter(item => !hiddenIds.has(readFragment(ProductCardFragment, item).productId));
}
