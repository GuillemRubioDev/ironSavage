import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';

export default function CollectionLoading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Esqueleto de la barra de filtros */}
                <aside className="lg:col-span-1">
                    <div className="h-64 animate-pulse bg-muted rounded-lg" />
                </aside>

                {/* Esqueleto de la rejilla de productos */}
                <div className="lg:col-span-3">
                    <ProductGridSkeleton />
                </div>
            </div>
        </div>
    );
}
