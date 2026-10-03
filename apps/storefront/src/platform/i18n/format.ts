import {toIntlLocale} from '@/platform/i18n/locale-utils';

type DateFormat = 'short' | 'long';

/**
 * Formatea una fecha en texto
 * @param dateString fecha en formato ISO
 * @param format 'short' (15 ene 2024) o 'long' (15 de enero de 2024)
 * @param locale código de idioma de la app (p. ej. 'es', 'en')
 */
export function formatDate(dateString: string, format: DateFormat = 'short', locale: string = 'es'): string {
    const options: Intl.DateTimeFormatOptions = format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return new Date(dateString).toLocaleDateString(toIntlLocale(locale), options);
}
