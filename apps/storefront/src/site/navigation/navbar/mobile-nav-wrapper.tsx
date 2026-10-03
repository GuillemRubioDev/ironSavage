import {ReactNode} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {MobileNav} from '@/site/navigation/navbar/mobile-nav';

/**
 * `currencyPicker` lo renderiza quien llama (navbar.tsx), NO se obtiene aquí: todo
 * este componente es `"use cache"` y CurrencyPickerWrapper es dinámico a propósito
 * (lee la cookie de moneda, nunca en caché). Meterlo dentro de esta zona en caché
 * rompería la separación dinámico/caché de Cache Components o guardaría en silencio
 * durante días un valor propio de cada sesión.
 */
export async function MobileNavWrapper({currencyPicker}: {currencyPicker: ReactNode}) {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`mobile-nav-${locale}`);

    const collections = await getTopCollections(locale);

    return <MobileNav collections={collections} currencyPicker={currencyPicker} />;
}
