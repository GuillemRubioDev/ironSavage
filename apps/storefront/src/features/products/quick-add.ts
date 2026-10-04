'use server';

import {getLocale} from 'next-intl/server';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {loadQuickAddProduct} from '@/features/products/quick-add-data';

/** Acción del selector rápido: el producto en el idioma y la moneda activos, o null. */
export async function getQuickAddProduct(slug: string) {
    const [locale, currencyCode] = await Promise.all([getLocale(), getActiveCurrencyCode()]);
    const product = await loadQuickAddProduct(slug, locale, currencyCode);
    return product ? {...product, currencyCode} : null;
}
