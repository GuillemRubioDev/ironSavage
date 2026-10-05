'use server';

import {mutate, VendureHttpError} from '@/platform/vendure/api';
import {RequestPasswordResetMutation} from '@/features/authentication/graphql';
import {getTranslations} from 'next-intl/server';
import {serverErrorMessage} from '@/platform/vendure/server-error-message';

export async function requestPasswordResetAction(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
    const t = await getTranslations('Errors');
    const emailAddress = formData.get('emailAddress') as string;

    if (!emailAddress) {
        return {error: t('emailRequired')};
    }

    try {
        const result = await mutate(RequestPasswordResetMutation, {
            emailAddress,
        });

        const resetResult = result.data.requestPasswordReset;

        if (resetResult?.__typename !== 'Success') {
            return {error: resetResult?.errorCode ? await serverErrorMessage(resetResult.errorCode) : t('failedPasswordReset')};
        }

        return {success: true};
    } catch (err) {
        if (err instanceof VendureHttpError && err.status === 429) {
            return {error: t('tooManyAttempts')};
        }
        return {error: t('unexpectedError')};
    }
}
