import {ResultOf, readFragment} from '@/platform/vendure/graphql';
import {ProductCard} from './components/product-card';
import {Pagination} from './components/pagination';
import {SortDropdown} from '@/features/search/sort-dropdown';
import {SearchProductsQuery} from '@/features/search/graphql';
import {ProductCardFragment} from '@/features/products/graphql';
import {filterVisibleProducts} from '@/features/products/visibility';
import {getCollectionsMap} from '@/features/collections/data';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';

interface ProductGridProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    currentPage: number;
    take: number;
}

export async function ProductGrid({productDataPromise, currentPage, take}: ProductGridProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Product'});
    const result = await productDataPromise;

    const searchResult = result.data.search;
    const [visibleItems, collectionsMap] = await Promise.all([
        filterVisibleProducts(searchResult.items),
        getCollectionsMap(locale),
    ]);
    const totalItems = searchResult.totalItems - (searchResult.items.length - visibleItems.length);
    const totalPages = Math.ceil(totalItems / take);

    if (!visibleItems.length) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">{t('noProductsFound')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {t('productCount', {count: totalItems})}
                </p>
                <SortDropdown/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleItems.map((product, i) => {
                    const {collectionIds} = readFragment(ProductCardFragment, product);
                    const categoryName = collectionIds[0] ? collectionsMap.get(collectionIds[0])?.name : undefined;
                    return <ProductCard key={'product-grid-item' + i} product={product} categoryName={categoryName}/>;
                })}
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages}/>
            )}
        </div>
    );
}
