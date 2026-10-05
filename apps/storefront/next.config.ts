import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/site/i18n/request.ts');

// La versión de la aplicación es el "version" del package.json de la raíz del
// monorepo (una sola versión para toda la tienda: servidor + storefront).
// Súbela ahí en cada versión nueva; se muestra en el pie de la tienda.
// `next build`/`next dev` siempre se ejecutan desde apps/storefront (npm -w, y el
// Dockerfile copia el package.json de la raíz en la etapa de build).
const {version: APP_VERSION} = JSON.parse(readFileSync(resolve(process.cwd(), '../../package.json'), 'utf8')) as {version: string};

// Identificador único de cada compilación: la app abierta en el navegador lo compara
// con el de /api/version para saber si se ha desplegado una versión nueva y
// recargarse sola (ver site/app-shell/app-freshness.tsx).
const BUILD_ID = `${APP_VERSION}-${Date.now().toString(36)}`;

const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: APP_VERSION,
        NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    },
    // Genera .next/standalone: un servidor autocontenido con solo los
    // node_modules que se usan de verdad, en vez de necesitar todos los del
    // workspace en ejecución. Es lo que permite una imagen Docker ligera.
    output: 'standalone',
    cacheComponents: true,
    experimental: {
        // Next 16.3 predice el árbol de rutas a partir de la URL ("optimistic
        // routing") para no pedírselo al servidor. Con el prefijo de idioma
        // opcional de next-intl (`localePrefix: 'as-needed'`), /registro se
        // reescribe a /es/registro en el proxy, pero el cliente lo interpreta como
        // [locale]="registro": monta un layout raíz entero nuevo (cabecera, main y
        // pie) durante la navegación y vuelve al bueno cuando responde el
        // servidor. Se veía como un fotograma en blanco, skeletons de más y los
        // botones de la cabecera parpadeando en cada cambio de página.
        optimisticRouting: false,
    },
    // Quita la cabecera "X-Powered-By: Next.js": revela menos información del
    // servidor; no cambia nada funcional.
    poweredByHeader: false,
    images: {
        // Solo hace falta para que la API de optimización de imágenes pueda leer
        // de un Vendure local en desarrollo (URLs de recursos en
        // localhost/127.0.0.1). Activado en producción, permitiría a esa API leer de
        // cualquier IP local o privada que alcance el contenedor: un riesgo real,
        // porque esa API tuvo una vulnerabilidad crítica de ejecución remota sin
        // autenticar (GHSA-2xp9-vwfh-vxw4, corregida al actualizar Next.js; ver
        // package.json). Limitarlo a desarrollo elimina ese riesgo en producción,
        // donde no hace falta: ASSET_URL_PREFIX siempre es un dominio https:// real.
        dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
        remotePatterns: [
            {
                hostname: 'readonlydemo.vendure.io',
            },
            {
                hostname: 'demo.vendure.io'
            },
            {
                hostname: 'localhost'
            },
            // Producción: las imágenes de producto se sirven desde ASSET_URL_PREFIX,
            // que apunta al dominio público de la API detrás del proxy inverso.
            ...(process.env.API_DOMAIN ? [{
                protocol: 'https' as const,
                hostname: process.env.API_DOMAIN,
            }] : []),
        ],
    },
};

export default withNextIntl(nextConfig);
