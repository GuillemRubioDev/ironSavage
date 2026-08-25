import type {Locale} from './routing';

const OG_LOCALE_MAP: Record<Locale, string> = { es: 'es_ES', en: 'en_US' };
const INTL_LOCALE_MAP: Record<Locale, string> = { es: 'es-ES', en: 'en-US' };

export function toOgLocale(locale: string): string {
    return OG_LOCALE_MAP[locale as Locale] || 'es_ES';
}

export function toIntlLocale(locale: string): string {
    return INTL_LOCALE_MAP[locale as Locale] || 'es-ES';
}
