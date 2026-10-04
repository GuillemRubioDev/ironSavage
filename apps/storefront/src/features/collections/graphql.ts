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

// Consulta de respaldo ligera para CategoriesShowcase: solo los campos necesarios
// para elegir una imagen de producto representativa de una colección sin
// featuredAsset propio; a propósito no es el fragmento ProductCard completo.
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

// La Shop API de Vendure limita las listas a 100 elementos (apiOptions.shopListQueryLimit).
export const GetAllCollectionsQuery = graphql(`
    query GetAllCollections {
        collections(options: { take: 100 }) {
            items {
                id
                name
                slug
                parentId
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
