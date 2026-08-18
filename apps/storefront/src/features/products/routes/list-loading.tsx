import {ProductGridSkeleton} from '@/features/products/product-grid-skeleton';

export default function ProductListLoading() {
    return (
        <div className="container mx-auto px-4 py-8 mt-16">
            <ProductGridSkeleton />
        </div>
    );
}
