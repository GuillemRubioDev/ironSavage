/**
 * Google Analytics 4 — measurement ID and event helper.
 *
 * GA only exists in production, and only for visitors who accepted the
 * "analytics" cookie category: NEXT_PUBLIC_GA_ID is set only in the
 * production build (see .env.prod.example), and gtag.js is loaded by
 * site/analytics/google-analytics.tsx after consent. Features can call
 * `trackEvent` unconditionally: without an ID it does nothing, and without
 * consent nothing is ever sent (see pendingEvents).
 */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || '';

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

/** A product in a GA4 ecommerce event. Prices in major units (e.g. 24.2 €). */
export interface AnalyticsItem {
    item_id: string;
    item_name: string;
    item_variant?: string;
    price?: number;
    quantity?: number;
}

/**
 * Events fired before GA is ready. React runs a page's effects before the
 * layout's, so e.g. `view_item` on a freshly loaded product page happens
 * before GoogleAnalytics has set up `window.gtag`. They wait here, in memory
 * only, and are sent when GA initialises with consent — or dropped with the
 * page if the visitor never consents. Nothing leaves the browser before that.
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

/** Called by GoogleAnalytics once gtag is set up with consent. */
export function flushPendingEvents(): void {
    for (const [name, params] of pendingEvents.splice(0)) {
        window.gtag?.('event', name, params);
    }
}

/** Called by GoogleAnalytics when consent is refused or withdrawn. */
export function clearPendingEvents(): void {
    pendingEvents.length = 0;
}

/** Vendure prices are integers in minor units (cents); GA4 expects major units. */
export function toMajorUnits(amount: number): number {
    return Math.round(amount) / 100;
}
