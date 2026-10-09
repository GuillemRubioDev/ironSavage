/** Tipos de la ficha de producto compartidos por sus componentes de cliente. */
export interface DetailAsset {
    id: string;
    preview: string;
}

export interface DetailVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    discountedPriceWithTax: number;
    stockLevel: string;
    customFields?: {netQuantity?: string | null; isNew?: boolean | null} | null;
    featuredAsset?: DetailAsset | null;
    assets: DetailAsset[];
    options: Array<{id: string; code: string; name: string; groupId: string}>;
}

export interface DetailOptionGroup {
    id: string;
    code: string;
    name: string;
    options: Array<{id: string; code: string; name: string; customFields?: {swatchColor?: string | null} | null}>;
}

export interface DetailProduct {
    id: string;
    name: string;
    slug: string;
    customFields?: {isNew?: boolean | null} | null;
    assets: DetailAsset[];
    variants: DetailVariant[];
    optionGroups: DetailOptionGroup[];
}
