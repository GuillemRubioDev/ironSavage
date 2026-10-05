'use server';

import {getMyAthleteProfile} from '@/features/loyalty/athlete';

/**
 * Si el cliente actual suma puntos con sus compras: los atletas activos no los suman
 * (el servidor los excluye, plugin athletes). Lo pide la ficha de producto desde el
 * navegador, porque la página está en caché y es la misma para todos. Si la consulta
 * falla, true: casi todos los clientes suman puntos.
 */
export async function earnsLoyaltyPoints(): Promise<boolean> {
    try {
        const athlete = await getMyAthleteProfile();
        return !athlete?.enabled;
    } catch {
        return true;
    }
}
