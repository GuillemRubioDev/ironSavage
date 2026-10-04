import type {ReactNode} from 'react';
import {getActiveCustomer} from '@/features/account/customer';
import {redirect} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

/**
 * Barrera de todas las páginas de "Mi cuenta": sin un cliente con la sesión
 * iniciada, redirige al login en vez de pintar formularios vacíos (direcciones,
 * perfil…). proxy.ts ya corta antes las visitas sin cookie de sesión; esto cubre
 * la cookie caducada o inválida, que solo se descubre preguntando a Vendure.
 * Lee cookies, así que debe ir dentro de un <Suspense>.
 */
export async function RequireCustomer({children}: {children: ReactNode}) {
    const customer = await getActiveCustomer();
    if (!customer) {
        const locale = await getRouteLocale();
        return redirect({href: '/login?redirectTo=/mi-cuenta', locale});
    }
    return <>{children}</>;
}
