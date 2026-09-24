import {Suspense} from 'react';
import ProductDetailPage, {generateMetadata} from '@/features/products/routes/page';
import {ProductReviewsSection} from '@/features/reviews/components/product-reviews-section';

// Only "site" is allowed to depend on more than one feature at once — see
// tests/architecture/boundaries.test.mjs. The product detail page and the
// reviews section are each a self-contained feature; putting them on the
// same page is a composition decision that belongs here, not inside
// features/products reaching into features/reviews directly.
export {generateMetadata};

export default function ProductDetailPageWithReviews(props: PageProps<'/[locale]/productos/[slug]'>) {
    return (
        <ProductDetailPage
            {...props}
            reviewsSlot={({productId, productSlug}) => (
                // Reads the auth cookie for a signed-in customer's own review
                // eligibility, so it's isolated in its own Suspense boundary
                // rather than blocking the surrounding statically-cached page.
                <Suspense fallback={<div className="py-16" />}>
                    <ProductReviewsSection productId={productId} productSlug={productSlug} />
                </Suspense>
            )}
        />
    );
}
