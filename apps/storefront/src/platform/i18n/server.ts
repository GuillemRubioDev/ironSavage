import {locale as rootLocale} from 'next/root-params';
import {hasLocale} from 'next-intl';
import {routing} from './routing';

/**
 * Envoltorio seguro de rootLocale() que valida contra la configuración de rutas y,
 * si no encaja, usa defaultLocale en vez de devolver undefined.
 *
 * Úsalo en server components, generateMetadata y funciones 'use cache'. Las server
 * actions deben usar getLocale() de next-intl/server, porque se ejecutan fuera del
 * árbol RSC en caché y tienen todo el contexto de la petición.
 */
export async function getRouteLocale(): Promise<string> {
    const loc = await rootLocale();
    return hasLocale(routing.locales, loc) ? loc : routing.defaultLocale;
}
