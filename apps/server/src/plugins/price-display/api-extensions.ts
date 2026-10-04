import { gql } from 'graphql-tag';

export const shopApiExtensions = gql`
    extend type ProductVariant {
        "Precio con IVA del variante tras los descuentos públicos visibles en la ficha. Igual a priceWithTax si no hay descuento."
        discountedPriceWithTax: Int!
    }

    extend type SearchResult {
        "Rango de precios con IVA del producto tras los descuentos públicos visibles en la ficha."
        discountedPriceWithTax: PriceRange!
        "Producto marcado como novedad en el administrador."
        isNew: Boolean!
    }
`;
