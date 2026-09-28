import {cache} from 'react';
import {getAuthToken} from '@/platform/vendure/auth-token';
import {query} from '@/platform/vendure/api';
import {GetMyAthleteProfileQuery} from './graphql';

/**
 * The signed-in customer's athlete profile, or null for regular customers
 * and anonymous visitors. Cached per request: the account layout (to decide
 * whether to show the "Athlete" section) and the athlete page both call it.
 */
export const getMyAthleteProfile = cache(async () => {
    const token = await getAuthToken();
    if (!token) {
        return null;
    }
    const {data} = await query(GetMyAthleteProfileQuery, undefined, {token});
    return data.myAthleteProfile ?? null;
});
