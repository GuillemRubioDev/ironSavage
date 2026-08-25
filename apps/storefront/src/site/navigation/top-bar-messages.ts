import type {Locale} from '@/platform/i18n/routing';

/**
 * Simple local config for the top announcement bar (site/navigation/top-bar.tsx).
 * Only real, currently-true claims — no invented "free shipping" or similar
 * commercial terms that don't exist.
 */
export interface TopBarMessage {
    id: string;
    text: Record<Locale, string>;
}

export const topBarMessages: TopBarMessage[] = [
    {id: 'fast-shipping', text: {es: 'Envío rápido', en: 'Fast shipping'}},
    {id: 'secure-payment', text: {es: 'Pago seguro con Redsys', en: 'Secure payment with Redsys'}},
    {id: 'loyalty-points', text: {es: 'Acumula puntos en tus compras', en: 'Earn points on every order'}},
];
