'use client';

import {useTranslations} from 'next-intl';
import {Skeleton} from '@/components/ui/skeleton';

/**
 * Hueco de la cuenta mientras llega la sesión: mismo tamaño que el botón final sin
 * sesión (icono en móvil; "Iniciar sesión" en escritorio, con el texto real invisible
 * para que cuadre en cualquier idioma). Con un ancho fijo distinto, al llegar el
 * botón se desplazaban el buscador y los selectores en cada primera carga.
 */
export function NavbarUserSkeleton() {
    const t = useTranslations('Navigation');
    return (
        <Skeleton aria-hidden="true" className="grid size-10 place-items-center border border-transparent bg-white/10 lg:h-9 lg:w-auto lg:px-3">
            <span className="invisible hidden text-sm font-semibold whitespace-nowrap lg:inline">{t('signIn')}</span>
        </Skeleton>
    );
}
