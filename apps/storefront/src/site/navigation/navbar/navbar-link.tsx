'use client';

import {useSelectedLayoutSegment} from 'next/navigation';
import {ComponentProps} from 'react';
import { Link } from '@/platform/i18n/navigation';
import {
    NavigationMenuLink,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {cn} from '@/lib/utils';

export function NavbarLink({href, ...rest}: ComponentProps<typeof Link>) {
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const pathname = selectedLayoutSegment ? `/${selectedLayoutSegment}` : '/';
    const isActive = pathname === href;

    return (
        <NavigationMenuLink render={<Link
                aria-current={isActive ? 'page' : undefined}
                className={cn(navigationMenuTriggerStyle(), 'bg-transparent px-2.5 text-xs font-semibold uppercase tracking-wide text-brand-fg/80 hover:bg-white/10 hover:text-brand-fg focus:bg-white/10 focus:text-brand-fg data-active:text-brand-fg')}
                href={href}
                {...rest}
            />} active={isActive} />
    );
}