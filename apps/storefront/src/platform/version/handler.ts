import {NextResponse} from 'next/server';

/**
 * Versión desplegada de la tienda. La consulta AppFreshness desde el navegador
 * para detectar que hay una compilación nueva y recargar la app. Nunca debe quedar
 * en caché del navegador ni de ningún proxy.
 */
export function GET() {
    return NextResponse.json(
        {buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? null, version: process.env.NEXT_PUBLIC_APP_VERSION ?? null},
        {headers: {'Cache-Control': 'no-store, max-age=0'}},
    );
}
