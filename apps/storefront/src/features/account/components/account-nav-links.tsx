'use client';

import { Link, usePathname } from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {FileText, LayoutDashboard, LogOut, MapPin, Package, Star, Trophy, User} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {useFormStatus} from 'react-dom';
import {logoutAction} from '@/features/authentication/logout';

const iconMap: Record<string, LucideIcon> = {
    LayoutDashboard,
    Package,
    MapPin,
    User,
    FileText,
    Star,
    Trophy,
};

interface NavItem {
    href: string;
    labelKey: string;
    icon: string;
    /** Activo solo con la ruta exacta (el resumen /mi-cuenta, padre de todas las demás). */
    exact?: boolean;
}

interface AccountNavLinksProps {
    items: NavItem[];
    layout: 'horizontal' | 'vertical';
    /** Nombre del cliente para la cabecera de la barra lateral (puede ir vacío). */
    name: string;
    /** Inicial del cliente para el círculo de la barra lateral. */
    initial: string;
}

/**
 * Navegación de la cuenta: pestañas en móvil y, en escritorio, barra lateral oscura
 * (zona de marca) con la inicial del cliente, las secciones y cerrar sesión.
 */
export function AccountNavLinks({items, layout, name, initial}: AccountNavLinksProps) {
    const pathname = usePathname();
    const t = useTranslations('Account');
    const isActiveItem = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

    if (layout === 'horizontal') {
        return (
            <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
                {items.map((item) => {
                    const isActive = isActiveItem(item);
                    const Icon = iconMap[item.icon];
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                                isActive
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                            )}
                        >
                            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                            {t(item.labelKey)}
                        </Link>
                    );
                })}
            </nav>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg bg-brand text-brand-fg">
            <div className="flex items-center gap-3 border-b border-brand-line p-4">
                <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-solid font-display text-xl font-black italic">
                    {initial}
                </span>
                {name && <span className="truncate text-sm font-semibold">{name}</span>}
            </div>
            <nav className="p-2">
                {items.map((item) => {
                    const isActive = isActiveItem(item);
                    const Icon = iconMap[item.icon];
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'border-primary-solid bg-white/10 text-brand-fg'
                                    : 'border-transparent text-brand-muted hover:bg-white/5 hover:text-brand-fg'
                            )}
                        >
                            {Icon && <Icon className="size-5" aria-hidden="true" />}
                            {t(item.labelKey)}
                        </Link>
                    );
                })}
            </nav>
            <form action={logoutAction} className="border-t border-brand-line p-2">
                <LogoutButton label={t('logout')} />
            </form>
        </div>
    );
}

/** Botón de cerrar sesión: se bloquea mientras la acción trabaja (evita un doble envío). */
function LogoutButton({label}: {label: string}) {
    const {pending} = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="flex w-full items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium text-brand-muted transition-colors hover:bg-white/5 hover:text-brand-fg disabled:opacity-60"
        >
            <LogOut className="size-5" aria-hidden="true" />
            {label}
        </button>
    );
}
