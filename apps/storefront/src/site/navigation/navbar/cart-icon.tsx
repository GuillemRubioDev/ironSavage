'use client';

import {ShoppingCart} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';
import {Price} from '@/features/pricing/price';

interface CartIconProps {
    cartItemCount: number;
    totalWithTax: number;
    currencyCode: string;
}

/**
 * Carrito de la cabecera: icono, nº de artículos e importe (el importe desde md).
 * `key={cartItemCount}` reinicia la animación pop-in del contador cada vez que cambia:
 * es el "salto" del carrito al añadir un producto.
 */
export function CartIcon({cartItemCount, totalWithTax, currencyCode}: CartIconProps) {
    const t = useTranslations('Navigation');
    return (
        <Link
            href="/carrito"
            className="press relative inline-flex h-9 items-center gap-2 rounded-lg bg-primary-solid px-3 text-sm font-bold text-primary-foreground hover:bg-[#c50009]"
        >
            <ShoppingCart className="size-4" aria-hidden="true" />
            <span className="hidden font-mono md:inline" aria-hidden="true"><Price value={totalWithTax} currencyCode={currencyCode} /></span>
            {cartItemCount > 0 && (
                <span key={cartItemCount} aria-hidden="true" className="animate-pop-in grid size-5 place-items-center rounded-full bg-white text-[11px] text-primary-solid">
                    {cartItemCount}
                </span>
            )}
            <span className="sr-only">{t('cartTotal', {count: cartItemCount})}</span>
        </Link>
    );
}
