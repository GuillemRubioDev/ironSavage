'use client';

import {useTranslations} from 'next-intl';

interface ProductBadgesProps {
    percent: number;
    isNew: boolean;
}

/**
 * Distintivos sobre la foto: un triángulo semitransparente en la esquina superior
 * izquierda con el % de descuento, y la etiqueta "Novedad" arriba a la derecha.
 * Van dentro de un contenedor `relative`. Son solo visuales, no bloquean clics.
 */
export function ProductBadges({percent, isNew}: ProductBadgesProps) {
    const t = useTranslations('Product');
    return (
        <>
            {percent > 0 && (
                <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 size-24">
                    <div
                        className="absolute inset-0 bg-destructive/75"
                        style={{clipPath: 'polygon(0 0, 100% 0, 0 100%)'}}
                    />
                    <span className="absolute left-2 top-2 text-xs font-bold leading-none text-white">
                        -{percent}%
                    </span>
                </div>
            )}
            {isNew && (
                <span className="pointer-events-none absolute right-3 top-3 bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                    {t('newBadge')}
                </span>
            )}
        </>
    );
}
