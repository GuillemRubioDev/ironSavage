import { graphql } from '@/gql';

export const adminBannerListDocument = graphql(`
    query AdminBannerList($options: BannerListOptions) {
        adminBanners(options: $options) {
            items {
                id
                titleEs
                position
                enabled
                imageLayout
                image {
                    id
                    preview
                }
            }
            totalItems
        }
    }
`);

export const adminBannerDetailDocument = graphql(`
    query AdminBannerDetail($id: ID!) {
        adminBanner(id: $id) {
            id
            titleEs
            titleEn
            subtitleEs
            subtitleEn
            ctaLabelEs
            ctaLabelEn
            href
            align
            imageLayout
            position
            enabled
            image {
                id
                preview
            }
        }
    }
`);

export const createBannerDocument = graphql(`
    mutation CreateBanner($input: CreateBannerInput!) {
        createBanner(input: $input) {
            __typename
            ... on Banner {
                id
            }
            ... on BannerError {
                errorCode
                message
            }
        }
    }
`);

export const updateBannerDocument = graphql(`
    mutation UpdateBanner($id: ID!, $input: UpdateBannerInput!) {
        updateBanner(id: $id, input: $input) {
            __typename
            ... on Banner {
                id
            }
            ... on BannerError {
                errorCode
                message
            }
        }
    }
`);

export const deleteBannerDocument = graphql(`
    mutation DeleteBanner($id: ID!) {
        deleteBanner(id: $id)
    }
`);
