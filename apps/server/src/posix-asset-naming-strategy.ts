import { RequestContext } from '@vendure/core';
import { HashedAssetNamingStrategy } from '@vendure/asset-server-plugin';
import { hasWebpPreview } from './webp-asset-preview-strategy';

/**
 * HashedAssetNamingStrategy construye los nombres de archivo con `path.join()`, que
 * en Windows genera barras invertidas. Ese texto se guarda tal cual como `source`/
 * `preview` del recurso y se reutiliza como ruta de la URL, así que lo subido desde
 * Windows da URLs como `/assets/preview\ab\file.jpg`, que no son válidas: los
 * navegadores solo usan `/` como separador (las peticiones fetch/proxy no normalizan
 * las barras invertidas como sí lo hace una navegación normal). Se fuerzan barras
 * normales sea cual sea el sistema operativo.
 */
export class PosixAssetNamingStrategy extends HashedAssetNamingStrategy {
    generateSourceFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string): string {
        return super.generateSourceFileName(ctx, originalFileName, conflictFileName).replace(/\\/g, '/');
    }

    /**
     * Además, la preview de las imágenes raster se guarda en WebP
     * (webp-asset-preview-strategy.ts), así que su nombre lleva `.webp`: el servidor
     * de assets deduce el Content-Type de la extensión.
     */
    generatePreviewFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string): string {
        const fileName = super.generatePreviewFileName(ctx, originalFileName, conflictFileName).replace(/\\/g, '/');
        return hasWebpPreview(originalFileName) ? fileName.replace(/\.[^./]+$/, '.webp') : fileName;
    }
}
