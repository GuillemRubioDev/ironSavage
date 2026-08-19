'use server';

import {mutate} from '@/platform/vendure/api';
import {CreateProductReviewMutation} from '@/features/reviews/graphql';

export interface CreateReviewResult {
    success: boolean;
    error?: string;
}

/**
 * Deliberately does NOT revalidate the product page after a successful
 * submission: the new review is PENDING, so it wouldn't change anything
 * publicly visible yet, and revalidating would re-render the (now
 * ineligible) parent Server Component, unmounting this client form before
 * the "submitted, awaiting moderation" confirmation could ever be seen. The
 * page reflects the updated eligibility naturally on the next real visit.
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
