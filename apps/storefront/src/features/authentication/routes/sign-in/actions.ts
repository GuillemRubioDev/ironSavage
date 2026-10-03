'use server';

import {mutate, VendureHttpError} from '@/platform/vendure/api';
import {LoginMutation} from '@/features/authentication/graphql';
import {setAuthToken} from '@/platform/vendure/auth-token';
import {redirect} from '@/platform/i18n/navigation';
import {revalidatePath} from "next/cache";
import {getLocale, getTranslations} from 'next-intl/server';

export async function loginAction(prevState: { error?: string } | undefined, formData: FormData) {
    const t = await getTranslations('Errors');
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const redirectTo = formData.get('redirectTo') as string | null;

    let result;
    try {
        result = await mutate(LoginMutation, {
            username,
            password,
        }, { useAuthToken: true });
    } catch (err) {
        if (err instanceof VendureHttpError && err.status === 429) {
            return { error: t('tooManyAttempts') };
        }
        throw err;
    }

    const loginResult = result.data.login;

    if (loginResult.__typename !== 'CurrentUser') {
        if (loginResult.__typename === 'NotVerifiedError') {
            return { error: t('verifyEmailFirst') };
        }
        return { error: t('invalidCredentials') };
    }

    // Guarda el token en una cookie si viene en la respuesta
    if (result.token) {
        await setAuthToken(result.token);
    }

    const locale = await getLocale();
    revalidatePath(`/${locale}`, 'layout');

    // Comprueba que redirectTo sea una ruta interna segura
    const safeRedirect = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
        ? redirectTo
        : '/';

    redirect({href: safeRedirect, locale});
}
