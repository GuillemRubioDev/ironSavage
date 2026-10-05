'use client';

import {ShoppingCart} from 'lucide-react';
import {Price} from '@/features/pricing/price';

/**
 * Hueco del carrito mientras llega el pedido (depende de la sesión): el mismo botón
 * rojo que CartIcon con el importe de un carrito vacío invisible, para reservar su
 * ancho. Sin él, el carrito aparecía de la nada y empujaba el resto de la cabecera.
 */
export function NavbarCartSkeleton() {
    return (
        <span aria-hidden="true" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary-solid px-3 text-sm font-bold text-primary-foreground">
            <ShoppingCart className="size-4" />
            <span className="invisible hidden font-mono md:inline"><Price value={0} currencyCode="EUR" /></span>
        </span>
    );
}
