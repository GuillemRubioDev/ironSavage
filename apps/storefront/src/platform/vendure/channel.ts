import {cacheLife} from 'next/cache';
import {query} from './api';
import {GetActiveChannelQuery} from './channel-graphql';

/**
 * Obtiene el canal activo, con caché.
 * La configuración del canal casi nunca cambia, así que se guarda una hora.
 * No depende del idioma, así que no hace falta locale.
 */
export async function getActiveChannel() {
    'use cache';
    cacheLife('hours');

    const result = await query(GetActiveChannelQuery);
    return result.data.activeChannel;
}
