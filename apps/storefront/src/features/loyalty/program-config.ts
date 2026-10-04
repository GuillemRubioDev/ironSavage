import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetLoyaltyProgramConfigQuery} from '@/features/loyalty/graphql';

/**
 * Reglas del programa de puntos tal como las tiene configuradas el servidor
 * (LoyaltyPlugin.init en vendure-config.ts). Solo cambian con un despliegue, así que
 * se guardan en caché unos días; la etiqueta permite revalidarlas a mano.
 */
export async function getLoyaltyProgramConfig() {
    'use cache';
    cacheLife('days');
    cacheTag('loyalty-config');

    const result = await query(GetLoyaltyProgramConfigQuery);
    return result.data.loyaltyProgramConfig;
}
