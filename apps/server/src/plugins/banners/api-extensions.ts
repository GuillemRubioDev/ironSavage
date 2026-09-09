import { gql } from 'graphql-tag';

const commonTypes = gql`
    type Banner {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        titleEs: String!
        titleEn: String!
        subtitleEs: String
        subtitleEn: String
        ctaLabelEs: String!
        ctaLabelEn: String!
        href: String!
        image: Asset
        align: String!
        imageLayout: String!
        position: Int!
        enabled: Boolean!
    }

    type BannerList {
        items: [Banner!]!
        totalItems: Int!
    }

    input BannerListOptions {
        skip: Int
        take: Int
    }
`;

export const shopApiExtensions = gql`
    ${commonTypes}

    extend type Query {
        "Only enabled banners, in display order — the only way banners are ever exposed publicly."
        activeBanners: [Banner!]!
    }
`;

export const adminApiExtensions = gql`
    ${commonTypes}

    input CreateBannerInput {
        titleEs: String!
        titleEn: String!
        subtitleEs: String
        subtitleEn: String
        ctaLabelEs: String!
        ctaLabelEn: String!
        href: String!
        imageId: ID
        align: String
        imageLayout: String
        position: Int
        enabled: Boolean
    }

    input UpdateBannerInput {
        titleEs: String
        titleEn: String
        subtitleEs: String
        subtitleEn: String
        ctaLabelEs: String
        ctaLabelEn: String
        href: String
        imageId: ID
        align: String
        imageLayout: String
        position: Int
        enabled: Boolean
    }

    type BannerError implements ErrorResult {
        errorCode: ErrorCode!
        message: String!
    }

    union CreateBannerResult = Banner | BannerError
    union UpdateBannerResult = Banner | BannerError

    extend type Query {
        adminBanners(options: BannerListOptions): BannerList!
        adminBanner(id: ID!): Banner
    }

    extend type Mutation {
        createBanner(input: CreateBannerInput!): CreateBannerResult!
        updateBanner(id: ID!, input: UpdateBannerInput!): UpdateBannerResult!
        deleteBanner(id: ID!): Boolean!
    }
`;
