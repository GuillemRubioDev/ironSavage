import { RequestContext } from '@vendure/core';
import { HashedAssetNamingStrategy } from '@vendure/asset-server-plugin';

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

    generatePreviewFileName(ctx: RequestContext, originalFileName: string, conflictFileName?: string): string {
        return super.generatePreviewFileName(ctx, originalFileName, conflictFileName).replace(/\\/g, '/');
    }
}
