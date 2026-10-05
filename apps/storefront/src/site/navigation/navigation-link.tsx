import NextLink from 'next/link';
import {getRouteLocale} from '@/platform/i18n/server';
import {PAGE_TRANSITION} from '@/platform/i18n/navigation';
import {localizedPath} from '@/config/metadata';
import {ComponentProps} from 'react';

type NavigationLinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & {
    href: string;
};

/**
 * Enlace que tiene en cuenta el idioma, para server components en caché o estáticos
 * (layout, navbar, pie).
 *
 * Usa next/link con rootLocale() para construir el href con el mismo criterio que el
 * proxy de next-intl (`localePrefix: 'as-needed'`): sin prefijo en el idioma por
 * defecto (/productos) y con prefijo en los demás (/en/productos). Con el prefijo
 * siempre, cada clic en español pasaba por una redirección 307 de /es/... a /...
 * antes de navegar. El Link de next-intl siempre llama internamente a useLocale(),
 * que accede a datos dinámicos y rompe el prerenderizado PPR en rutas con parámetros
 * dinámicos.
 *
 * Anima el cambio de página como el Link de cliente (PAGE_TRANSITION).
 *
 * En componentes de cliente, usa el Link de @/platform/i18n/navigation.
 */
export async function NavigationLink({href, ...rest}: NavigationLinkProps) {
    const locale = await getRouteLocale();
    const localizedHref = href === '/' ? localizedPath(locale, '').replace(/^$/, '/') : localizedPath(locale, href);
    return <NextLink href={localizedHref} transitionTypes={PAGE_TRANSITION} {...rest} />;
}
