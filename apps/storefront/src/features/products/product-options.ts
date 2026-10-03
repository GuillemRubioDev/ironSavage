import type { ResultOf } from 'gql.tada';
import type {GetProductDetailQuery} from './graphql';

type ProductDetail = NonNullable<ResultOf<typeof GetProductDetailQuery>['product']>;

/**
 * Vendure 3.6 hizo que ProductOptionGroup/ProductOption sean compartidos y dependan
 * del canal (vendure#4469): `optionGroups` de un producto devuelve ahora todas las
 * opciones del grupo (quizá compartido), incluidas las que no tienen variante en este
 * producto. Mostrarlas tal cual crea botones «fantasma» sin precio, sin stock y con
 * el botón de añadir al carrito siempre desactivado.
 *
 * Esto devuelve los grupos reducidos a las opciones que usa alguna variante del
 * producto, y quita los grupos que se quedan sin opciones.
 */
export function getDisplayOptionGroups(product: ProductDetail): ProductDetail['optionGroups'] {
    const usedOptionIds = new Set(
        product.variants.flatMap((variant) => variant.options.map((option) => option.id)),
    );

    return product.optionGroups
        .map((group) => ({
            ...group,
            options: group.options.filter((option) => usedOptionIds.has(option.id)),
        }))
        .filter((group) => group.options.length > 0);
}
