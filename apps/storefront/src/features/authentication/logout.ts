'use server';

import {getLocale} from 'next-intl/server';
import {redirect} from '@/platform/i18n/navigation';
import {removeAuthToken} from '@/platform/vendure/auth-token';
import {mutate} from '@/platform/vendure/api';
import {LogoutMutation} from './graphql';

export async function logoutAction() {
    // Hay que enviar el token actual: si no, Vendure no sabe qué sesión cerrar y
    // `logout` no hace nada en el servidor, y el token sigue siendo válido (usable como
    // Bearer en otro sitio) aunque aquí se «cierre la sesión».
    await mutate(LogoutMutation, {}, {useAuthToken: true});
    await removeAuthToken();

    const locale = await getLocale();
    redirect({href: '/', locale});
}
