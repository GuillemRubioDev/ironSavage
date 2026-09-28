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
 * Reads the session (to show the athlete section only to athletes), so it
 * must render inside a <Suspense> boundary to keep the layout prerenderable.
 */
export async function AccountNav({layout}: {layout: 'horizontal' | 'vertical'}) {
    const athleteProfile = await getMyAthleteProfile();
    const items = athleteProfile ? [...navItems.slice(0, 3), athleteItem, ...navItems.slice(3)] : navItems;
    return <AccountNavLinks items={items} layout={layout}/>;
}
