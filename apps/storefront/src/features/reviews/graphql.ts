import {graphql} from '@/platform/vendure/graphql';

export const GetProductReviewsQuery = graphql(`
    query GetProductReviews($productId: ID!, $options: ProductReviewListOptions) {
        productReviews(productId: $productId, options: $options) {
            totalItems
            items {
                id
                createdAt
                rating
                title
                comment
            }
        }
        productReviewSummary(productId: $productId) {
            averageRating
            reviewCount
        }
    }
`);

export const GetMyReviewableOrdersQuery = graphql(`
    query GetMyReviewableOrders($productId: ID!) {
        activeCustomer {
            id
        }
        myReviewableOrdersForProduct(productId: $productId) {
            orderId
            orderCode
        }
    }
`);

export const CreateProductReviewMutation = graphql(`
    mutation CreateProductReview($input: CreateProductReviewInput!) {
        createProductReview(input: $input) {
            __typename
            ... on ProductReview {
                id
                status
            }
            ... on ProductReviewError {
                errorCode
                message
            }
        }
    }
`);
