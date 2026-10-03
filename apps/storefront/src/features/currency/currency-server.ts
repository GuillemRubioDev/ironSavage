import {getCurrencyCookie} from './currency';
import {getActiveChannel} from '@/platform/vendure/channel';

/**
 * Devuelve el código de moneda activo de la petición actual.
 * Lo lee de la cookie; si no hay, usa el del canal.
 *
 * Seguro dentro de 'use cache: private' (las cookies forman parte de la clave de caché por usuario).
 * NO es seguro dentro de un 'use cache' público: en ese caso pasa la moneda como parámetro.
 */
export async function getActiveCurrencyCode(): Promise<string> {
    const cookieValue = await getCurrencyCookie();
    if (cookieValue) return cookieValue;

    const channel = await getActiveChannel();
    return channel.defaultCurrencyCode;
}
