'use server';

import {mutate, VendureHttpError} from '@/platform/vendure/api';
import {VerifyCustomerAccountMutation} from '@/features/authentication/graphql';
import {setAuthToken} from '@/platform/vendure/auth-token';
import {getTranslations} from 'next-intl/server';

export async function verifyAccountAction(token: string, password?: string) {
    const t = await getTranslations('Errors');

    if (!token) {
        return {error: t('verificationTokenRequired')};
    }

    try {
        const result = await mutate(VerifyCustomerAccountMutation, {
            token,
            password: password || undefined,
        });

        const verifyResult = result.data.verifyCustomerAccount;

        if (verifyResult.__typename !== 'CurrentUser') {
            return {error: verifyResult.message};
        }

        // Store the token in a cookie if returned
        if (result.token) {
            await setAuthToken(result.token);
        }

        return {success: true};
    } catch (err) {
        if (err instanceof VendureHttpError && err.status === 429) {
            return {error: t('tooManyAttempts')};
        }
        return {error: t('unexpectedError')};
    }
}
