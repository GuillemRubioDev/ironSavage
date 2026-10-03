/**
 * Google Analytics 4: ID de medición y utilidad para eventos.
 *
 * GA solo existe en producción y solo para quien aceptó la categoría de cookies
 * «analíticas»: NEXT_PUBLIC_GA_ID solo se define en la build de producción (ver
 * .env.prod.example) y gtag.js lo carga site/analytics/google-analytics.tsx tras el
 * consentimiento. Las funcionalidades pueden llamar a `trackEvent` sin comprobar
 * nada: sin ID no hace nada, y sin consentimiento nunca se envía nada (ver pendingEvents).
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || '';

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

/** Un producto en un evento de comercio electrónico de GA4. Precios en euros, no céntimos (p. ej. 24.2 €). */
export interface AnalyticsItem {
    item_id: string;
    item_name: string;
    item_variant?: string;
    price?: number;
    quantity?: number;
}

/**
 * Eventos lanzados antes de que GA esté listo. React ejecuta los efectos de la página
 * antes que los del layout, así que p. ej. `view_item` en una ficha recién cargada
 * ocurre antes de que GoogleAnalytics prepare `window.gtag`. Esperan aquí, solo en
 * memoria, y se envían cuando GA arranca con consentimiento, o se pierden con la
 * página si el visitante nunca consiente. Antes de eso no sale nada del navegador.
 */
const pendingEvents: Array<[string, Record<string, unknown>]> = [];
const MAX_PENDING_EVENTS = 50;

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
    if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
        return;
    }
    if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
    } else if (pendingEvents.length < MAX_PENDING_EVENTS) {
        pendingEvents.push([name, params]);
    }
}

/** Lo llama GoogleAnalytics cuando gtag está listo con consentimiento. */
export function flushPendingEvents(): void {
    for (const [name, params] of pendingEvents.splice(0)) {
        window.gtag?.('event', name, params);
    }
}

/** Lo llama GoogleAnalytics cuando se rechaza o retira el consentimiento. */
export function clearPendingEvents(): void {
    pendingEvents.length = 0;
}

/** Los precios de Vendure son enteros en céntimos; GA4 espera euros. */
export function toMajorUnits(amount: number): number {
    return Math.round(amount) / 100;
}
