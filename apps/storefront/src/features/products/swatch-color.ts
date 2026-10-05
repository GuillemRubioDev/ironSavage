/** Color válido de una opción (#RRGGBB, el formato que exige el campo del servidor), o null. */
export function swatchColorOf(color: string | null | undefined): string | null {
    return color && /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}
