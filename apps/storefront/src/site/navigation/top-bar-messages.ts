import type {Locale} from '@/platform/i18n/routing';

/**
 * Configuración local sencilla de la barra de avisos superior
 * (site/navigation/top-bar.tsx). Solo afirmaciones reales y vigentes: nada de «envío
 * gratis» inventado ni condiciones comerciales que no existan.
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
