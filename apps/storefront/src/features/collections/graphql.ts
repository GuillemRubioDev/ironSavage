import {graphql} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';

export const GetTopCollectionsQuery = graphql(`
    query GetTopCollections {
        collections(options: { filter: { parentId: { eq: "1" } } }) {
            items {
                id
                name
                slug
                featuredAsset {
                    preview
                }
            }
        }
    }
`);

// Lean fallback query for CategoriesShowcase: only the fields needed to pick
// a representative product image for a collection that has no featuredAsset
// of its own — deliberately not the full ProductCard fragment.
export const GetCollectionFallbackImagesQuery = graphql(`
    query GetCollectionFallbackImages($input: SearchInput!) {
        search(input: $input) {
            items {
                productAsset {
                    preview
                }
            }
        }
    }
`);

// Vendure's Shop API caps list queries at 100 items (apiOptions.shopListQueryLimit).
export const GetAllCollectionsQuery = graphql(`
    query GetAllCollections {
        collections(options: { take: 100 }) {
            items {
                id
                name
                slug
            }
        }
    }
`);

export const GetCollectionProductsQuery = graphql(`
    query GetCollectionProducts($slug: String!, $input: SearchInput!) {
        collection(slug: $slug) {
            id
            name
            slug
            description
            featuredAsset {
                id
                preview
            }
        }
        search(input: $input) {
            totalItems
            items {
                ...ProductCard
            }
        }
    }
`, [ProductCardFragment]);
