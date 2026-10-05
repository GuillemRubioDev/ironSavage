import {getTranslations} from 'next-intl/server';
import {serverErrorKey} from '@/platform/vendure/server-errors';

/** Texto traducido (idioma de la petición) para un error de Vendure, por su errorCode. */
export async function serverErrorMessage(errorCode: string | null | undefined, locale?: string): Promise<string> {
    const t = locale ? await getTranslations({locale, namespace: 'ServerErrors'}) : await getTranslations('ServerErrors');
    return t(serverErrorKey(errorCode));
}
