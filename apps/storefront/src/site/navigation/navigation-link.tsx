import NextLink from 'next/link';
import {getRouteLocale} from '@/platform/i18n/server';
import {ComponentProps} from 'react';

type NavigationLinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & {
    href: string;
};

/**
 * Enlace que tiene en cuenta el idioma, para server components en caché o estáticos
 * (layout, navbar, pie).
 *
 * Usa next/link con rootLocale() para construir hrefs con el prefijo de idioma. El
 * Link de next-intl siempre llama internamente a useLocale(), que accede a datos
 * dinámicos y rompe el prerenderizado PPR en rutas con parámetros dinámicos.
 *
 * En componentes de cliente, usa el Link de @/platform/i18n/navigation.
 */
export async function NavigationLink({href, ...rest}: NavigationLinkProps) {
    const locale = await getRouteLocale();
    const localizedHref = href === '/' ? `/${locale}` : `/${locale}${href}`;
    return <NextLink href={localizedHref} {...rest} />;
}
