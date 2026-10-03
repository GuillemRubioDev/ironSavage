import {Suspense} from 'react';
import ProductDetailPage, {generateMetadata} from '@/features/products/product-detail-page';
import {ProductReviewsSection} from '@/features/reviews/product-reviews-section';

// Solo "site" puede depender de varias funcionalidades a la vez; ver
// tests/architecture/boundaries.test.mjs. La ficha de producto y la sección de
// reseñas son funcionalidades independientes; ponerlas en la misma página es una
// decisión de composición que va aquí, no dentro de features/products entrando
// directamente en features/reviews.
export {generateMetadata};

export default function ProductDetailPageWithReviews(props: PageProps<'/[locale]/productos/[slug]'>) {
    return (
        <ProductDetailPage
            {...props}
            reviewsSlot={({productId, productSlug}) => (
                // Lee la cookie de autenticación para saber si el cliente puede reseñar,
                // así que va aislado en su propio Suspense en vez de bloquear el resto
                // de la página, que está en caché estática.
                <Suspense fallback={<div className="py-16" />}>
                    <ProductReviewsSection productId={productId} productSlug={productSlug} />
                </Suspense>
            )}
        />
    );
}
