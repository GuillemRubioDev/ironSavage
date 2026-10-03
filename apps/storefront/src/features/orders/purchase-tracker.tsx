'use client';

import {useEffect} from 'react';
import {type AnalyticsItem, trackEvent} from '@/platform/analytics/gtag';

interface PurchaseTrackerProps {
    orderCode: string;
    currency: string;
    /** En euros, no en céntimos (p. ej. 30.25). */
    value: number;
    shipping: number;
    items: AnalyticsItem[];
}

/**
 * Evento `purchase` de GA4, enviado desde la página de confirmación del pedido cuando
 * el pago está confirmado. Se recuerda en localStorage por código de pedido, así que
 * recargar la página (o volver más tarde) nunca cuenta dos veces la misma venta. Sin
 * consentimiento de analítica, `window.gtag` no existe y no se envía nada.
 */
export function PurchaseTracker({orderCode, currency, value, shipping, items}: PurchaseTrackerProps) {
    useEffect(() => {
        const key = `ga-purchase-${orderCode}`;
        try {
            if (localStorage.getItem(key)) return;
            localStorage.setItem(key, '1');
        } catch {
            // Almacenamiento no disponible: se envía igual; GA4 también deduplica por transaction_id.
        }
        trackEvent('purchase', {transaction_id: orderCode, currency, value, shipping, items});
        // Una vez por montaje: las props vienen del render del servidor y no cambian.
    }, [orderCode]);

    return null;
}
