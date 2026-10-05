'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocale} from 'next-intl';
import {toIntlLocale} from '@/platform/i18n/locale-utils';

/**
 * Precio que, al cambiar, cuenta desde el valor anterior hasta el nuevo (idea "Count Up"
 * de React Bits, sin dependencias). Pensado para el importe del carrito de la cabecera:
 * al añadir un producto se ve subir el total donde el usuario está mirando. En el
 * primer render y con "reducir movimiento" se pinta el valor directamente. Usar con
 * cifras tabulares (font-mono) para que el ancho no baile mientras cuenta.
 */
export function AnimatedPrice({value, currencyCode = 'EUR', duration = 500}: {
    value: number;
    currencyCode?: string;
    duration?: number;
}) {
    const locale = useLocale();
    const formatter = useMemo(
        () => new Intl.NumberFormat(toIntlLocale(locale), {style: 'currency', currency: currencyCode}),
        [locale, currencyCode],
    );
    const [shown, setShown] = useState(value);
    const previous = useRef(value);

    useEffect(() => {
        const from = previous.current;
        previous.current = value;
        if (from === value) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShown(value);
            return;
        }
        const start = performance.now();
        let frame = 0;
        const step = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setShown(Math.round(from + (value - from) * eased));
            if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);

    return <>{formatter.format(shown / 100)}</>;
}
