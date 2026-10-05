import {swatchColorOf} from '@/features/products/swatch-color';

/**
 * Punto de color de una opción (p. ej. el sabor), si tiene color en el dashboard
 * (ProductOption.customFields.swatchColor). Decorativo: el nombre ya va en el botón.
 */
export function OptionSwatch({color}: {color: string | null | undefined}) {
    const valid = swatchColorOf(color);
    if (!valid) return null;
    return <span className="size-3 shrink-0 rounded-full ring-1 ring-black/20 ring-inset" style={{backgroundColor: valid}} aria-hidden="true" />;
}
