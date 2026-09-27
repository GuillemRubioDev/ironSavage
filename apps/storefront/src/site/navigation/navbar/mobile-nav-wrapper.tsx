import {ReactNode} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {MobileNav} from '@/site/navigation/navbar/mobile-nav';

/**
 * `currencyPicker` is rendered by the caller (navbar.tsx), NOT fetched in
 * here: this whole component is `"use cache"`, and CurrencyPickerWrapper is
 * deliberately dynamic (reads the currency cookie, never cached) — nesting
 * it inside this cached boundary would either violate Cache Components'
 * dynamic/cached separation or silently cache a per-session value for days.
 */
export async function MobileNavWrapper({currencyPicker}: {currencyPicker: ReactNode}) {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`mobile-nav-${locale}`);

    const collections = await getTopCollections(locale);

    return <MobileNav collections={collections} currencyPicker={currencyPicker} />;
}
