import type {ComponentType} from 'react';
import {FileText, LogIn, MapPin, Package, Star, User, UserPlus} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {SheetClose} from '@/components/ui/sheet';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getActiveCustomer} from '@/features/account/customer';
import {LoginButton} from '@/site/navigation/navbar/login-button';

const LINK_CLASS = 'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors';

function SheetLink({href, icon: Icon, label}: {href: string; icon: ComponentType<{className?: string}>; label: string}) {
    return (
        <SheetClose render={<Link href={href} className={LINK_CLASS} />} nativeButton={false}>
            <Icon className="h-5 w-5" />
            {label}
        </SheetClose>
    );
}

/**
 * Sección "Cuenta" del menú móvil. Va aparte de MobileNav porque ese menú se sirve
 * desde una caché pública ("use cache", igual para todos) y no puede saber si hay
 * sesión: navbar.tsx la renderiza por visitante y se la pasa como hueco. Sin sesión
 * solo ofrece iniciar sesión o crear cuenta; los enlaces de perfil, pedidos,
 * facturas, puntos y direcciones solo aparecen con un cliente identificado.
 */
export async function MobileAccountLinks() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Navigation'});
    const customer = await getActiveCustomer();

    return (
        <div>
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('account')}
            </p>
            {customer ? (
                <nav aria-label={t('account')} className="flex flex-col gap-0.5">
                    <SheetLink href="/mi-cuenta/profile" icon={User} label={t('profile')} />
                    <SheetLink href="/mi-cuenta/pedidos" icon={Package} label={t('orders')} />
                    <SheetLink href="/mi-cuenta/facturas" icon={FileText} label={t('invoices')} />
                    <SheetLink href="/mi-cuenta/puntos" icon={Star} label={t('points')} />
                    <SheetLink href="/mi-cuenta/addresses" icon={MapPin} label={t('addresses')} />
                    <LoginButton isLoggedIn className={`${LINK_CLASS} text-left text-muted-foreground`} />
                </nav>
            ) : (
                <nav aria-label={t('account')} className="flex flex-col gap-0.5">
                    <p className="px-3 pb-2 text-sm text-muted-foreground">{t('accountSignedOutHint')}</p>
                    <SheetLink href="/login" icon={LogIn} label={t('signIn')} />
                    <SheetLink href="/registro" icon={UserPlus} label={t('createAccount')} />
                </nav>
            )}
        </div>
    );
}
