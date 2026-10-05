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
            }
        }
    }
`);

/**
 * URL de la imagen del panel de acceso configurada en el admin (Ajustes globales), o
 * null. Si la consulta falla (p. ej. un servidor aún sin el plugin), null: el panel
 * usa el fondo de marca. Se revalida con la etiqueta storefront-settings.
 */
export async function getAuthPanelImage(): Promise<string | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag('storefront-settings');

    try {
        const {data} = await query(StorefrontSettingsQuery);
        const settings = (data as unknown as {storefrontSettings?: {authPanelImage?: {preview: string} | null}}).storefrontSettings;
        return settings?.authPanelImage?.preview ?? null;
    } catch {
        return null;
    }
}
