'use server';

import {mutate} from '@/platform/vendure/api';
import {CreateProductReviewMutation} from '@/features/reviews/graphql';

export interface CreateReviewResult {
    success: boolean;
    error?: string;
}

/**
 * A propósito NO revalida la página del producto tras enviar: la reseña nueva está
 * PENDING, así que aún no cambia nada visible, y revalidar volvería a renderizar el
 * Server Component padre (que ya no permite reseñar), desmontando este formulario
 * antes de que se vea la confirmación «enviada, pendiente de moderación». La página
 * reflejará el cambio en la próxima visita.
 */
export async function createReviewAction(
    input: {productId: string; orderId: string; rating: number; title: string; comment: string},
): Promise<CreateReviewResult> {
    const result = await mutate(CreateProductReviewMutation, {input}, {useAuthToken: true});
    const reviewResult = result.data.createProductReview;

    if (reviewResult.__typename !== 'ProductReview') {
        return {success: false, error: reviewResult.message};
    }

    return {success: true};
}
