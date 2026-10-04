import {ReactNode} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getGoalCollections, getTopCollections} from '@/features/collections/data';
import {MobileNav} from '@/site/navigation/navbar/mobile-nav';

/**
 * `currencyPicker` lo renderiza quien llama (navbar.tsx), NO se obtiene aquí: todo
 * este componente es `"use cache"` y CurrencyPickerWrapper es dinámico a propósito
 * (lee la cookie de moneda, nunca en caché). Meterlo dentro de esta zona en caché
 * rompería la separación dinámico/caché de Cache Components o guardaría en silencio
 * durante días un valor propio de cada sesión. Lo mismo con `accountLinks`, que
 * depende de si hay sesión iniciada.
 */
export async function MobileNavWrapper({currencyPicker, accountLinks}: {currencyPicker: ReactNode; accountLinks: ReactNode}) {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`mobile-nav-${locale}`);
    cacheTag(`goal-collections-${locale}`);
    cacheTag('collections');

    const [collections, goals] = await Promise.all([getTopCollections(locale), getGoalCollections(locale)]);

    return <MobileNav collections={collections} goals={goals} currencyPicker={currencyPicker} accountLinks={accountLinks} />;
}
