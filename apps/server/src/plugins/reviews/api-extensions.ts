import { gql } from 'graphql-tag';

const commonTypes = gql`
    type ProductReview {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        productId: ID!
        orderId: ID!
        customerId: ID!
        rating: Int!
        title: String!
        comment: String!
        status: String!
    }

    type ProductReviewList {
        items: [ProductReview!]!
        totalItems: Int!
    }

    input ProductReviewListOptions {
        skip: Int
        take: Int
    }
`;

export const shopApiExtensions = gql`
    ${commonTypes}

    type ProductReviewSummary {
        averageRating: Float!
        reviewCount: Int!
    }

    type ReviewableOrder {
        orderId: ID!
        orderCode: String!
    }

    input CreateProductReviewInput {
        productId: ID!
        orderId: ID!
        rating: Int!
        title: String!
        comment: String!
    }

    input UpdateProductReviewInput {
        id: ID!
        rating: Int
        title: String
        comment: String
    }

    type ProductReviewError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union CreateProductReviewResult = ProductReview | ProductReviewError
    union UpdateProductReviewResult = ProductReview | ProductReviewError

    extend type Query {
        "Only APPROVED reviews — this is the only way reviews are ever exposed publicly."
        productReviews(productId: ID!, options: ProductReviewListOptions): ProductReviewList!
        productReviewSummary(productId: ID!): ProductReviewSummary!
        "Orders (of the signed-in customer) that make them eligible to review this product but haven't been reviewed yet."
        myReviewableOrdersForProduct(productId: ID!): [ReviewableOrder!]!
    }

    extend type Mutation {
        createProductReview(input: CreateProductReviewInput!): CreateProductReviewResult!
        "Only the review's own author may call this, and only while it is still PENDING."
        updateProductReview(input: UpdateProductReviewInput!): UpdateProductReviewResult!
    }
`;

export const adminApiExtensions = gql`
    ${commonTypes}

    # Resolved live from the Product, for display purposes only — not stored on the review.
    extend type ProductReview {
        productName: String
    }

    input ProductReviewFilterParameter {
        status: StringOperators
        "Matches against the product's name."
        productSearch: StringOperators
    }

    "Only createdAt/rating are actually sortable; other fields are accepted (per Vendure's own ListOptions convention) but ignored."
    input ProductReviewSortParameter {
        createdAt: SortOrder
        rating: SortOrder
    }

    input AdminProductReviewListOptions {
        skip: Int
        take: Int
        filter: ProductReviewFilterParameter
        sort: ProductReviewSortParameter
    }

    extend type Query {
        adminProductReviews(options: AdminProductReviewListOptions): ProductReviewList!
    }

    extend type Mutation {
        approveProductReview(id: ID!): ProductReview
        rejectProductReview(id: ID!): ProductReview
    }
`;
