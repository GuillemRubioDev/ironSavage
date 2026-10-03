import {AccountNavLinks} from '@/features/account/components/account-nav-links';
import {getMyAthleteProfile} from '@/features/loyalty/athlete';

const navItems = [
    {href: '/mi-cuenta/pedidos', labelKey: 'orders', icon: 'Package'},
    {href: '/mi-cuenta/facturas', labelKey: 'invoices', icon: 'FileText'},
    {href: '/mi-cuenta/puntos', labelKey: 'points', icon: 'Star'},
    {href: '/mi-cuenta/addresses', labelKey: 'addresses', icon: 'MapPin'},
    {href: '/mi-cuenta/profile', labelKey: 'profile', icon: 'User'},
];

const athleteItem = {href: '/mi-cuenta/atleta', labelKey: 'athlete', icon: 'Trophy'};

/**
 * Lee la sesión (para mostrar la sección de atleta solo a los atletas), así que debe
 * renderizarse dentro de un <Suspense> para que el layout se pueda prerenderizar.
 */
export async function AccountNav({layout}: {layout: 'horizontal' | 'vertical'}) {
    const athleteProfile = await getMyAthleteProfile();
    const items = athleteProfile ? [...navItems.slice(0, 3), athleteItem, ...navItems.slice(3)] : navItems;
    return <AccountNavLinks items={items} layout={layout}/>;
}
