import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {graphql} from '@/platform/vendure/graphql';

// La copia local del esquema (graphql-env.d.ts) aún no conoce storefrontSettings (la
// añade el plugin storefront-settings del servidor): el resultado se tipa a mano, igual
// que activeBanners en site/home/banners-data.ts.
const StorefrontSettingsQuery = graphql(`
    query StorefrontSettings {
        storefrontSettings {
            authPanelImage {
                preview
                focalPoint {
                    x
                    y
                }
            }
        }
    }
`);

export interface AuthPanelImage {
    /**
     * Preview de Vendure (WebP de hasta 2048 px, de sobra para media pantalla); next/image
     * la reduce al tamaño justo. Antes se usaba el original porque la preview de serie
     * (máx. 1600 px) se veía borrosa, pero el original no tiene límite de tamaño.
     */
    url: string;
    /** Punto focal elegido en el dashboard, como object-position ("50% 30%"). */
    position: string;
}

/** Lectura en caché: si la consulta falla lanza el error, y los errores no se cachean. */
async function loadAuthPanelImage(): Promise<AuthPanelImage | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag('storefront-settings');

    const {data} = await query(StorefrontSettingsQuery);
    const image = (data as unknown as {
        storefrontSettings?: {authPanelImage?: {preview: string; focalPoint?: {x: number; y: number} | null} | null};
    }).storefrontSettings?.authPanelImage;
    if (!image?.preview) return null;
    const focal = image.focalPoint;
    return {
        url: image.preview,
        position: focal ? `${Math.round(focal.x * 100)}% ${Math.round(focal.y * 100)}%` : '50% 50%',
    };
}

/**
 * Imagen del panel de acceso configurada en el admin (Ajustes globales), o null. Si la
 * consulta falla (p. ej. un servidor aún sin el plugin), null y el panel usa el fondo de
 * marca. Ese fallo no se guarda en la caché de datos, pero si ocurre al prerenderizar
 * la página, el HTML se queda sin imagen hasta que la página se regenere (etiqueta
 * storefront-settings).
 */
export async function getAuthPanelImage(): Promise<AuthPanelImage | null> {
    try {
        return await loadAuthPanelImage();
    } catch {
        return null;
    }
}
