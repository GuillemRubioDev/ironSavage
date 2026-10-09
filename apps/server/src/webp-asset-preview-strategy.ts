import path from 'path';
import { RequestContext } from '@vendure/core';
import { SharpAssetPreviewStrategy } from '@vendure/asset-server-plugin';
import sharp from 'sharp';

/**
 * Lado máximo de la preview. El storefront nunca sirve la preview tal cual: next/image
 * la usa como fuente para generar cada ancho en AVIF/WebP. 2048 cubre la ficha de
 * producto en pantallas retina (columna de ~650 px a densidad 2-3) sin pasarse.
 */
export const PREVIEW_MAX_SIZE = 2048;

/**
 * Calidad alta a propósito: la preview es una copia intermedia que se vuelve a
 * comprimir al servirla (next/image), así que aquí se evita sumar pérdida.
 */
export const PREVIEW_WEBP_QUALITY = 90;

/** Formatos raster cuya preview se guarda siempre en WebP. */
const WEBP_PREVIEW_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.avif'];
const WEBP_PREVIEW_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff', 'image/avif'];

/**
 * Si el archivo subido tendrá preview WebP. La estrategia de nombres
 * (posix-asset-naming-strategy.ts) lo usa para ponerle la extensión `.webp`: el
 * servidor de assets deduce el Content-Type de la extensión, así que nombre y
 * contenido tienen que coincidir.
 */
export function hasWebpPreview(fileName: string): boolean {
    return WEBP_PREVIEW_EXTENSIONS.includes(path.extname(fileName).toLowerCase());
}

/**
 * Preview de Vendure normalizada: WebP de calidad alta, como mucho de 2048 px, con
 * la transparencia y la orientación EXIF aplicadas y sin metadatos (sharp no los
 * copia). La de serie conserva el formato original, y un PNG daba previews que
 * pesaban más que el propio original (p. ej. 2,1 MB → 3,3 MB en develop).
 * GIF, SVG y archivos que no son imagen siguen con el comportamiento de serie.
 */
export class WebpAssetPreviewStrategy extends SharpAssetPreviewStrategy {
    constructor() {
        super({ maxWidth: PREVIEW_MAX_SIZE, maxHeight: PREVIEW_MAX_SIZE });
    }

    async generatePreviewImage(ctx: RequestContext, mimeType: string, data: Buffer): Promise<Buffer> {
        if (!WEBP_PREVIEW_MIME_TYPES.includes(mimeType)) {
            return super.generatePreviewImage(ctx, mimeType, data);
        }
        try {
            return await sharp(data, { failOn: 'truncated' })
                .rotate()
                .resize(PREVIEW_MAX_SIZE, PREVIEW_MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: PREVIEW_WEBP_QUALITY, smartSubsample: true })
                .toBuffer();
        } catch {
            // Imagen dañada: el icono genérico de Vendure, también en WebP para que
            // coincida con la extensión `.webp` que ya tiene el nombre.
            const fallback = await super.generatePreviewImage(ctx, 'application/octet-stream', data);
            return sharp(fallback).webp({ quality: PREVIEW_WEBP_QUALITY }).toBuffer();
        }
    }
}
