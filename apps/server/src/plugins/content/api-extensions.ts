import { gql } from 'graphql-tag';

const commonTypes = gql`
    type ContentArticle {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        titleEs: String!
        titleEn: String!
        slug: String!
        excerptEs: String!
        excerptEn: String!
        contentEs: String!
        contentEn: String!
        coverImage: Asset
        status: String!
        publishedAt: DateTime
    }

    type ContentArticleList {
        items: [ContentArticle!]!
        totalItems: Int!
    }

    input ContentArticleListOptions {
        skip: Int
        take: Int
    }
`;

export const shopApiExtensions = gql`
    ${commonTypes}

    extend type Query {
        "Only PUBLISHED articles — this is the only way articles are ever exposed publicly."
        articles(options: ContentArticleListOptions): ContentArticleList!
        "Null for anything that isn't PUBLISHED, including a guessed slug of a draft/archived article."
        article(slug: String!): ContentArticle
    }
`;

export const adminApiExtensions = gql`
    ${commonTypes}

    input ContentArticleFilterParameter {
        status: StringOperators
        title: StringOperators
    }

    input AdminContentArticleListOptions {
        skip: Int
        take: Int
        filter: ContentArticleFilterParameter
        sort: ContentArticleSortParameter
    }

    "Only createdAt is actually sortable; other fields are accepted (per Vendure's own ListOptions convention) but ignored."
    input ContentArticleSortParameter {
        createdAt: SortOrder
    }

    input CreateContentArticleInput {
        titleEs: String!
        titleEn: String!
        slug: String!
        excerptEs: String!
        excerptEn: String!
        contentEs: String!
        contentEn: String!
        coverImageId: ID
    }

    input UpdateContentArticleInput {
        titleEs: String
        titleEn: String
        slug: String
        excerptEs: String
        excerptEn: String
        contentEs: String
        contentEn: String
        coverImageId: ID
    }

    type ContentArticleError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union CreateContentArticleResult = ContentArticle | ContentArticleError
    union UpdateContentArticleResult = ContentArticle | ContentArticleError

    extend type Query {
        adminArticles(options: AdminContentArticleListOptions): ContentArticleList!
        adminArticle(id: ID!): ContentArticle
    }

    extend type Mutation {
        createContentArticle(input: CreateContentArticleInput!): CreateContentArticleResult!
        updateContentArticle(id: ID!, input: UpdateContentArticleInput!): UpdateContentArticleResult!
        deleteContentArticle(id: ID!): Boolean!
        publishContentArticle(id: ID!): ContentArticle
        unpublishContentArticle(id: ID!): ContentArticle
    }
`;
