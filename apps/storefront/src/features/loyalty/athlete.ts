import {cache} from 'react';
import {getAuthToken} from '@/platform/vendure/auth-token';
import {query} from '@/platform/vendure/api';
import {GetMyAthleteProfileQuery} from './graphql';

/**
 * El perfil de atleta del cliente con sesión iniciada, o null para clientes normales
 * y visitantes anónimos. En caché por petición: lo llaman el layout de la cuenta
 * (para decidir si muestra la sección «Atleta») y la página de atleta.
 */
export const getMyAthleteProfile = cache(async () => {
    const token = await getAuthToken();
    if (!token) {
        return null;
    }
    const {data} = await query(GetMyAthleteProfileQuery, undefined, {token});
    return data.myAthleteProfile ?? null;
});
