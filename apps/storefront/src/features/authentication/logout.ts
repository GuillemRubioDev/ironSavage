'use server';

import {getLocale} from 'next-intl/server';
import {redirect} from '@/platform/i18n/navigation';
import {removeAuthToken} from '@/platform/vendure/auth-token';
import {mutate} from '@/platform/vendure/api';
import {LogoutMutation} from './graphql';

export async function logoutAction() {
    // Must attach the current token — otherwise Vendure has no session to
    // identify and `logout` is a no-op server-side, leaving the token valid
    // (usable as a Bearer token elsewhere) even after this "logs out".
    await mutate(LogoutMutation, {}, {useAuthToken: true});
    await removeAuthToken();

    const locale = await getLocale();
    redirect({href: '/', locale});
}
