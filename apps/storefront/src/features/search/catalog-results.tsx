import {Suspense} from 'react';
import type {ResultOf} from '@/platform/vendure/graphql';
import {SearchProductsQuery} from '@/features/search/graphql';
import {FacetFilters} from '@/features/search/facet-filters';
import {ProductGrid} from '@/features/products/product-grid';
import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';

/** Filtros a la izquierda y rejilla de productos: la misma estructura en productos, categoría y búsqueda. */
export function CatalogResults({productDataPromise, currentPage, showCount = false}: {
    productDataPromise: Promise<{data: ResultOf<typeof SearchProductsQuery>; token?: string}>;
    currentPage: number;
    showCount?: boolean;
}) {
    return (
        <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-4 lg:gap-8">
            <aside className="lg:col-span-1">
                <Suspense fallback={<div className="h-11 animate-pulse rounded-lg bg-muted lg:h-64" />}>
                    <FacetFilters productDataPromise={productDataPromise} />
                </Suspense>
            </aside>
            <div className="lg:col-span-3">
                <Suspense fallback={<ProductGridSkeleton />}>
                    <ProductGrid productDataPromise={productDataPromise} currentPage={currentPage} take={12} showCount={showCount} />
                </Suspense>
            </div>
        </div>
    );
}
