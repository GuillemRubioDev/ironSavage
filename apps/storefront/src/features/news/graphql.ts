import {graphql} from '@/platform/vendure/graphql';

// gql.tada's local schema snapshot predates these bilingual fields (same
// stale-CLI issue as the Banners plugin) — used to type-cast query results
// rather than chase the non-responsive `gql.tada generate-output` CLI.
export interface ArticleListItem {
    id: string;
    titleEs: string;
    titleEn: string;
    slug: string;
    excerptEs: string;
    excerptEn: string;
    publishedAt: string | null;
    coverImage?: {id: string; preview: string} | null;
}

export interface ArticleDetail {
    id: string;
    titleEs: string;
    titleEn: string;
    slug: string;
    excerptEs: string;
    excerptEn: string;
    contentEs: string;
    contentEn: string;
    publishedAt: string | null;
    coverImage?: {id: string; preview: string} | null;
}

export const GetArticlesQuery = graphql(`
    query GetArticles($options: ContentArticleListOptions) {
        articles(options: $options) {
            totalItems
            items {
                id
                titleEs
                titleEn
                slug
                excerptEs
                excerptEn
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
            titleEs
            titleEn
            slug
            excerptEs
            excerptEn
            contentEs
            contentEn
            publishedAt
            coverImage {
                id
                preview
            }
        }
    }
`);
