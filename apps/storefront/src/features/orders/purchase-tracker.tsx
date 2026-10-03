'use client';

import {useEffect} from 'react';
import {type AnalyticsItem, trackEvent} from '@/platform/analytics/gtag';

interface PurchaseTrackerProps {
    orderCode: string;
    currency: string;
    /** Major units (e.g. 30.25). */
    value: number;
    shipping: number;
    items: AnalyticsItem[];
}

/**
 * GA4 `purchase`, sent from the order confirmation page once the payment is
 * confirmed. Remembered in localStorage per order code, so reloading the page
 * (or coming back to it later) never counts the same sale twice. Without
 * analytics consent `window.gtag` doesn't exist and nothing is sent.
 */
export function PurchaseTracker({orderCode, currency, value, shipping, items}: PurchaseTrackerProps) {
    useEffect(() => {
        const key = `ga-purchase-${orderCode}`;
        try {
            if (localStorage.getItem(key)) return;
            localStorage.setItem(key, '1');
        } catch {
            // Storage unavailable — send anyway; GA4 also dedupes by transaction_id.
        }
        trackEvent('purchase', {transaction_id: orderCode, currency, value, shipping, items});
        // Once per mount: the props come from the server render and don't change.
    }, [orderCode]);

    return null;
}
