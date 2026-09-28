'use server';

import {mutate, VendureHttpError} from '@/platform/vendure/api';
import {VerifyCustomerAccountMutation} from '@/features/authentication/graphql';
import {setAuthToken} from '@/platform/vendure/auth-token';
import {getTranslations} from 'next-intl/server';
import type {VerifyResultValue} from './verify-result';

export async function verifyAccountAction(token: string, password?: string): Promise<VerifyResultValue> {
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
            // Accounts created by the store (e.g. an athlete registered from
            // the Dashboard) have no password yet: Vendure asks for one here
            // without consuming the token, so the page can collect it and retry.
            if (verifyResult.errorCode === 'MISSING_PASSWORD_ERROR') {
                return {needsPassword: true};
            }
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
