/**
 * Selección de variante a partir de las opciones elegidas: la usan el selector rápido
 * de las tarjetas y la ficha de producto. Sin dependencias, así que se prueba
 * directamente con node --test.
 *
 * Reglas del spec (7.8 y 7.9): un grupo con una sola opción sale ya marcado; la
 * selección vive solo en memoria (ni URL ni almacenamiento) y empieza vacía en cada
 * visita.
 */
export interface SelectableOption {
    id: string;
    groupId: string;
}

export interface SelectableVariant {
    id: string;
    options: SelectableOption[];
}

export interface SelectableGroup {
    id: string;
    options: Array<{id: string}>;
}

/** Grupo → opción elegida. */
export type Selection = Record<string, string>;

/** Marca de entrada solo los grupos que tienen una única opción. */
export function initialSelection(groups: SelectableGroup[]): Selection {
    const selection: Selection = {};
    for (const group of groups) {
        if (group.options.length === 1) selection[group.id] = group.options[0].id;
    }
    return selection;
}

function matches(variant: SelectableVariant, selection: Selection): boolean {
    return Object.entries(selection).every(([groupId, optionId]) =>
        variant.options.some(option => option.groupId === groupId && option.id === optionId),
    );
}

/** La variante de la selección; solo cuando todos los grupos están elegidos. */
export function findVariant<V extends SelectableVariant>(
    variants: V[],
    groups: SelectableGroup[],
    selection: Selection,
): V | undefined {
    if (groups.length === 0) return variants.length === 1 ? variants[0] : undefined;
    if (!groups.every(group => selection[group.id])) return undefined;
    return variants.find(variant => matches(variant, selection));
}

/** Si elegir esta opción deja alguna variante posible con lo ya elegido en los otros grupos. */
export function isOptionAvailable(
    variants: SelectableVariant[],
    selection: Selection,
    groupId: string,
    optionId: string,
): boolean {
    const next = {...selection, [groupId]: optionId};
    return variants.some(variant => matches(variant, next));
}

/**
 * Selección tras pulsar una opción. Si con lo ya elegido no hay variante, se conserva
 * la opción pulsada y solo las demás elecciones que sigan siendo compatibles con ella:
 * así ninguna combinación deja al cliente bloqueado sin poder llegar a otra variante.
 */
export function selectOption(
    variants: SelectableVariant[],
    selection: Selection,
    groupId: string,
    optionId: string,
): Selection {
    const next: Selection = {...selection, [groupId]: optionId};
    if (variants.some(variant => matches(variant, next))) return next;
    const kept: Selection = {[groupId]: optionId};
    for (const [otherGroup, otherOption] of Object.entries(selection)) {
        if (otherGroup === groupId) continue;
        const candidate = {...kept, [otherGroup]: otherOption};
        if (variants.some(variant => matches(variant, candidate))) kept[otherGroup] = otherOption;
    }
    return kept;
}
