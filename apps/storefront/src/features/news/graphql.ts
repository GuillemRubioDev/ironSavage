import {graphql} from '@/platform/vendure/graphql';

// La copia local del esquema de gql.tada es anterior a estos campos bilingües (el
// mismo problema de CLI desfasada que con los banners): se usan para forzar el tipo
// de los resultados en vez de pelearse con `gql.tada generate-output`, que no responde.
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
