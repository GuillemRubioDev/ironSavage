import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {routing} from './platform/i18n/routing';
import {GA_MEASUREMENT_ID} from './platform/analytics/gtag';

const middleware = createMiddleware(routing);

/**
 * CSP construida a partir de lo que este proyecto carga de verdad, no una plantilla
 * genérica, pero SIN nonce en script-src, a propósito. Se probó un nonce por petición
 * y se comprobó en vivo (navegador real, build de producción) que rompía la
 * hidratación en todas las rutas: los scripts en línea y de streaming que inyecta
 * Next (el helper `$RC` de reanudación de Suspense) nunca llevaban un nonce que
 * coincidiera con el de la cabecera CSP, aunque se pasara por
 * NextResponse.next({request:{headers}}) como indica la documentación de Next. Cada
 * carga daba errores «Refused to execute inline script», `$RC is not defined` y
 * fallos de hidratación de React (#419) con la combinación de esta aplicación:
 * middleware de next-intl + cacheComponents/PPR + streaming. Como la prioridad
 * explícita es no romper la tienda, se mantiene 'unsafe-inline' en script-src en vez
 * de publicar algo que rompa en silencio la interactividad de todas las páginas.
 * Aun así restringe bastante: ningún script, estilo, imagen, conexión, envío de
 * formulario, frame u objeto de un origen no listado; solo no añade protección
 * contra inyección de scripts en línea además de la limpieza que ya hace
 * platform/security/sanitize-html.ts. Revisar si una versión futura de Next.js hace
 * que nonce + PPR + streaming funcionen juntos en este stack.
 *
 * - Fuentes: next/font/google aloja las fuentes en la propia app al compilar (ver
 *   site/locale-layout.tsx); no hay peticiones a fonts.googleapis.com en ejecución.
 * - Imágenes: next/image solo resuelve a través de los hosts ya declarados en
 *   images.remotePatterns de next.config.ts.
 * - Redsys: el checkout construye y envía un <form> real que lleva el navegador a
 *   Redsys (submitRedsysRedirect en review-step.tsx); eso es cosa de
 *   `form-action`, no de `connect-src` (el navegador nunca hace fetch/XHR a
 *   Redsys). Se permiten siempre los hosts de pruebas y de producción de Redsys,
 *   porque REDSYS_ENVIRONMENT puede ser "test" aunque NODE_ENV sea "production"
 *   (ver production-safety.ts en el servidor).
 *
 * Solo se aplica fuera de desarrollo: en desarrollo se usa eval/HMR, que una CSP
 * estricta rompería, siguiendo la convención de dangerouslyAllowLocalIP/
 * poweredByHeader en next.config.ts de reforzar solo en producción.
 */
function buildCsp(): string {
    // Google Analytics 4 (solo si está configurado; ver platform/analytics/gtag.ts):
    // los hosts que Google documenta para GA4 con CSP.
    const ga = GA_MEASUREMENT_ID
        ? {
            script: ' https://*.googletagmanager.com',
            img: ' https://*.google-analytics.com https://*.googletagmanager.com',
            connect: ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com',
        }
        : {script: '', img: '', connect: ''};
    const imageHosts = [
        'https://readonlydemo.vendure.io',
        'https://demo.vendure.io',
        ...(process.env.API_DOMAIN ? [`https://${process.env.API_DOMAIN}`] : []),
    ];
    return [
        `default-src 'self'`,
        `script-src 'self' 'unsafe-inline'${ga.script}`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: ${imageHosts.join(' ')}${ga.img}`,
        `font-src 'self'`,
        `connect-src 'self'${ga.connect}`,
        `form-action 'self' https://sis-t.redsys.es:25443 https://sis.redsys.es`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        `object-src 'none'`,
    ].join('; ');
}

const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';
const LOCALE_PREFIX = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);

/**
 * Sin cookie de sesión no se entra en "Mi cuenta": redirige al login guardando la
 * página pedida (con su query, p. ej. el ?token de verificar el email) para volver
 * a ella tras iniciar sesión. Una cookie caducada la detecta después RequireCustomer.
 */
function redirectToLoginIfAnonymous(request: NextRequest): NextResponse | null {
    const {pathname, search} = request.nextUrl;
    const prefix = pathname.match(LOCALE_PREFIX)?.[0] ?? '';
    const path = pathname.slice(prefix.length) || '/';
    if (!/^\/mi-cuenta(\/|$)/.test(path) || request.cookies.has(AUTH_TOKEN_COOKIE)) {
        return null;
    }
    const loginUrl = new URL(`${prefix}/login`, request.url);
    loginUrl.searchParams.set('redirectTo', `${path}${search}`);
    return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
    const response = redirectToLoginIfAnonymous(request) ?? middleware(request);
    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Content-Security-Policy', buildCsp());
    }
    return response;
}

export const config = {matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']};
