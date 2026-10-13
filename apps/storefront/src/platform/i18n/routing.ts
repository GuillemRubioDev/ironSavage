import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
    locales: ['es', 'en'],
    defaultLocale: 'es',
    localePrefix: 'as-needed',
    // Sin cabecera HTTP `Link` con los hreflang: con cacheComponents, Next guarda las
    // cabeceras de la respuesta en la entrada de caché de cada página y, en cada
    // regeneración por tiempo, vuelve a añadir la del middleware a la ya guardada. La
    // cabecera crecía sin límite (más de 1 MB en develop) y Chrome cortaba la página con
    // ERR_HTTP2_COMPRESSION_ERROR. Los hreflang ya van en el <head> de cada página
    // (alternates.languages de generateMetadata), que es lo que leen los buscadores.
    alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
    es: 'Español',
    en: 'English',
};
