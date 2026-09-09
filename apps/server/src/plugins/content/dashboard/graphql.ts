import { graphql } from '@/gql';

export const adminArticleListDocument = graphql(`
    query AdminArticleList($options: AdminContentArticleListOptions) {
        adminArticles(options: $options) {
            items {
                id
                titleEs
                slug
                status
                publishedAt
                updatedAt
                coverImage {
                    id
                    preview
                }
            }
            totalItems
        }
    }
`);

export const adminArticleDetailDocument = graphql(`
    query AdminArticleDetail($id: ID!) {
        adminArticle(id: $id) {
            id
            titleEs
            titleEn
            slug
            excerptEs
            excerptEn
            contentEs
            contentEn
            status
            publishedAt
            coverImage {
                id
                preview
            }
        }
    }
`);

export const createArticleDocument = graphql(`
    mutation CreateContentArticle($input: CreateContentArticleInput!) {
        createContentArticle(input: $input) {
            __typename
            ... on ContentArticle {
                id
            }
            ... on ContentArticleError {
                errorCode
                message
            }
        }
    }
`);

export const updateArticleDocument = graphql(`
    mutation UpdateContentArticle($id: ID!, $input: UpdateContentArticleInput!) {
        updateContentArticle(id: $id, input: $input) {
            __typename
            ... on ContentArticle {
                id
            }
            ... on ContentArticleError {
                errorCode
                message
            }
        }
    }
`);

export const deleteArticleDocument = graphql(`
    mutation DeleteContentArticle($id: ID!) {
        deleteContentArticle(id: $id)
    }
`);

export const publishArticleDocument = graphql(`
    mutation PublishContentArticle($id: ID!) {
        publishContentArticle(id: $id) {
            id
            status
        }
    }
`);

export const unpublishArticleDocument = graphql(`
    mutation UnpublishContentArticle($id: ID!) {
        unpublishContentArticle(id: $id) {
            id
            status
        }
    }
`);
