import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {graphql, readFragment, type FragmentOf} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';

// Vendure's Shop API caps list queries at 100 items (apiOptions.shopListQueryLimit).
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
 * Product.customFields.visibleInStorefront lets a product stay enabled/manageable
 * while being hidden from storefront listings. Vendure's search index (used for
 * product grids) doesn't expose custom fields, so hidden product ids are fetched
 * separately here and filtered out after the fact.
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
