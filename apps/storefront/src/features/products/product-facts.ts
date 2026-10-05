/**
 * Datos derivados de la ficha de producto, sin dependencias (se prueban con
 * node --test): orden de la galería según la variante, cifras clave a partir de
 * datos reales del producto y puntos que suma una compra.
 */

/** Fotos de la variante elegida (la principal primero) y después las del producto, sin repetir. */
export function galleryFor<A extends {id: string}>(
    productAssets: A[],
    variant?: {featuredAsset?: A | null; assets?: A[] | null} | null,
): A[] {
    const ordered = variant ? [variant.featuredAsset, ...(variant.assets ?? []), ...productAssets] : productAssets;
    const seen = new Set<string>();
    return ordered.filter((asset): asset is A => {
        if (!asset || seen.has(asset.id)) return false;
        seen.add(asset.id);
        return true;
    });
}

/**
 * Proteína por dosis: última columna de la fila "Proteínas" de la tabla nutricional
 * ("Nutriente | por 100 g | por dosis"). Sin columna por dosis no se deduce nada.
 */
export function proteinPerServing(nutrition?: string | null): string | null {
    if (!nutrition) return null;
    for (const line of nutrition.split(/\r?\n/)) {
        const cells = line.split('|').map(cell => cell.trim());
        if (cells.length >= 3 && /^prote/i.test(cells[0])) return cells[cells.length - 1] || null;
    }
    return null;
}

type FactGroup = {code: string; name: string; options: Array<{name: string}>};
const FLAVOR = /sabor|flavou?r/i;
const SIZE = /peso|tama[nñ]o|size|weight|cantidad/i;
const findGroup = (groups: FactGroup[], pattern: RegExp) => groups.find(group => pattern.test(group.code) || pattern.test(group.name));

/** Nº de sabores (grupo de opciones Sabor/Flavour); solo cuando hay dos o más. */
export function flavorCount(groups: FactGroup[]): number | null {
    const group = findGroup(groups, FLAVOR);
    return group && group.options.length >= 2 ? group.options.length : null;
}

/**
 * Cantidad neta: el campo netQuantity de las variantes; si ninguna lo tiene, las
 * opciones del grupo de peso o tamaño. Varias se juntan con " · ".
 */
export function netQuantityLabel(
    variants: Array<{customFields?: {netQuantity?: string | null} | null}>,
    groups: FactGroup[],
): string | null {
    const values = [...new Set(variants.map(variant => variant.customFields?.netQuantity?.trim()).filter((v): v is string => Boolean(v)))];
    if (values.length) return values.join(' · ');
    const group = findGroup(groups, SIZE);
    return group?.options.length ? group.options.map(option => option.name).join(' · ') : null;
}

/** Puntos de una compra: la misma fórmula que el servidor, floor(euros × puntos por euro). */
export function pointsFor(priceCents: number, quantity: number, pointsPerEuro: number): number {
    return Math.floor(((priceCents * quantity) / 100) * pointsPerEuro);
}
