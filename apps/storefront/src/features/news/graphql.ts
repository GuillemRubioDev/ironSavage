import {graphql} from '@/platform/vendure/graphql';

export const GetArticlesQuery = graphql(`
    query GetArticles($options: ContentArticleListOptions) {
        articles(options: $options) {
            totalItems
            items {
                id
                title
                slug
                excerpt
                publishedAt
                coverImage {
                    id
                    preview
                }
            }
        }
    }
`);

export const GetArticleQuery = graphql(`
    query GetArticle($slug: String!) {
        article(slug: $slug) {
            id
            title
            slug
            excerpt
            content
            publishedAt
            coverImage {
                id
                preview
            }
        }
    }
`);
