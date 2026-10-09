// Sin dependencias de servidor: lo importa config/metadata.ts, que también usan
// componentes de cliente. La ruta que genera la imagen está en og-image.ts.

/** Ruta de esta API (app/api/og-image/route.ts). */
export const OG_IMAGE_ROUTE = '/api/og-image';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * Solo previews de Vendure (`preview/ab/nombre__preview.webp`): la ruta pide siempre al
 * servidor de assets propio, nunca a una URL que llegue de fuera.
 */
export const PREVIEW_PATH = /^preview\/[0-9a-f]{2}\/[\w.-]+$/;

/**
 * Ruta de la imagen Open Graph de una preview de Vendure, o null si la URL no es una
 * preview. Recibe la URL absoluta que devuelve la API (…/assets/preview/ab/x.webp).
 */
export function ogImagePath(previewUrl: string | null | undefined): string | null {
    const assetPath = previewUrl?.split('/assets/')[1];
    if (!assetPath || !PREVIEW_PATH.test(assetPath)) return null;
    return `${OG_IMAGE_ROUTE}?src=${encodeURIComponent(assetPath)}`;
}
