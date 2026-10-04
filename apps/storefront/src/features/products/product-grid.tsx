import {ResultOf, readFragment} from '@/platform/vendure/graphql';
import {ProductCard} from './components/product-card';
import {Pagination} from '@/components/pagination';
import {SortDropdown} from '@/features/search/sort-dropdown';
import {SearchProductsQuery} from '@/features/search/graphql';
import {ProductCardFragment} from '@/features/products/graphql';
import {filterVisibleProducts} from '@/features/products/visibility';
import {getCollectionsMap} from '@/features/collections/data';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {ActiveFilters} from '@/features/search/active-filters';

interface ProductGridProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    currentPage: number;
    take: number;
    /** Muestra el nº de productos en la barra (la búsqueda; los otros listados lo llevan en la franja). */
    showCount?: boolean;
}

type SearchResult = ResultOf<typeof SearchProductsQuery>['search'];

/** Productos visibles y su total: los ocultos en la tienda (visibleInStorefront) no cuentan. */
async function countVisible(searchResult: SearchResult) {
    const visibleItems = await filterVisibleProducts(searchResult.items);
    const totalItems = searchResult.totalItems - (searchResult.items.length - visibleItems.length);
    return {visibleItems, totalItems};
}

/** Nº de productos del listado, para la franja oscura (va dentro de su propio Suspense). */
export async function ProductCount({productDataPromise}: Pick<ProductGridProps, 'productDataPromise'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Product'});
    const result = await productDataPromise;
    const {totalItems} = await countVisible(result.data.search);
    return <>{t('productCount', {count: totalItems})}</>;
}

export async function ProductGrid({productDataPromise, currentPage, take, showCount = false}: ProductGridProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Product'});
    const result = await productDataPromise;

    const searchResult = result.data.search;
    const [{visibleItems, totalItems}, collectionsMap] = await Promise.all([
        countVisible(searchResult),
        getCollectionsMap(locale),
    ]);
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    {showCount && <p className="text-sm text-muted-foreground">{t('productCount', {count: totalItems})}</p>}
                    <ActiveFilters facetValues={searchResult.facetValues.map(f => ({id: f.facetValue.id, name: f.facetValue.name}))} />
                </div>
                <SortDropdown/>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-3">
                {visibleItems.map((product, i) => {
                    const {collectionIds} = readFragment(ProductCardFragment, product);
                    // Un producto también está en colecciones de objetivos (Ganar músculo…): la
                    // etiqueta de la tarjeta es siempre su categoría principal.
                    const categoryId = collectionIds.find(id => collectionsMap.get(id)?.isCategory) ?? collectionIds[0];
                    const categoryName = categoryId ? collectionsMap.get(categoryId)?.name : undefined;
                    return <ProductCard key={'product-grid-item' + i} product={product} categoryName={categoryName}/>;
                })}
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages}/>
            )}
        </div>
    );
}
