import {AccountNavLinks} from '@/features/account/components/account-nav-links';
import {getActiveCustomer} from '@/features/account/customer';
import {getMyAthleteProfile} from '@/features/loyalty/athlete';

const navItems = [
    {href: '/mi-cuenta', labelKey: 'summary', icon: 'LayoutDashboard', exact: true},
    {href: '/mi-cuenta/pedidos', labelKey: 'orders', icon: 'Package'},
    {href: '/mi-cuenta/facturas', labelKey: 'invoices', icon: 'FileText'},
    {href: '/mi-cuenta/puntos', labelKey: 'points', icon: 'Star'},
    {href: '/mi-cuenta/addresses', labelKey: 'addresses', icon: 'MapPin'},
    {href: '/mi-cuenta/profile', labelKey: 'profile', icon: 'User'},
];

const athleteItem = {href: '/mi-cuenta/atleta', labelKey: 'athlete', icon: 'Trophy'};

/**
 * Lee la sesión (inicial del cliente; sección de atleta solo para atletas), así que
 * debe renderizarse dentro de un <Suspense> para que el layout se pueda prerenderizar.
 */
export async function AccountNav({layout}: {layout: 'horizontal' | 'vertical'}) {
    const [athleteProfile, customer] = await Promise.all([getMyAthleteProfile(), getActiveCustomer()]);
    const items = athleteProfile ? [...navItems.slice(0, 4), athleteItem, ...navItems.slice(4)] : navItems;
    const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');
    const initial = (customer?.firstName || customer?.emailAddress || '?').charAt(0).toUpperCase();
    return <AccountNavLinks items={items} layout={layout} name={name} initial={initial} />;
}
