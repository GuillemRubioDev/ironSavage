'use server';

import {mutate, VendureHttpError} from '@/platform/vendure/api';
import {VerifyCustomerAccountMutation} from '@/features/authentication/graphql';
import {setAuthToken} from '@/platform/vendure/auth-token';
import {getTranslations} from 'next-intl/server';
import {serverErrorMessage} from '@/platform/vendure/server-error-message';
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
            // Las cuentas creadas por la tienda (p. ej. un atleta dado de alta desde el
            // dashboard) aún no tienen contraseña: Vendure la pide aquí sin gastar el
            // token, para que la página la recoja y vuelva a intentarlo.
            if (verifyResult.errorCode === 'MISSING_PASSWORD_ERROR') {
                return {needsPassword: true};
            }
            return {error: await serverErrorMessage(verifyResult.errorCode)};
        }

        // Guarda el token en una cookie si viene en la respuesta
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
