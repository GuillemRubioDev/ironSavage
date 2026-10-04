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

// Colecciones de objetivo (las crea el seed de objetivos con slug `objetivo-<código>`).
// Se buscan por el prefijo del slug: la colección padre «Objetivos» es privada y no
// sale en la Shop API, así que filtrar por parentId no serviría.
export const GetGoalCollectionsQuery = graphql(`
    query GetGoalCollections {
        collections(options: { filter: { slug: { contains: "objetivo-" } }, take: 20 }) {
            items {
                id
                name
                slug
                position
                featuredAsset {
                    preview
                }
            }
        }
    }
`);
