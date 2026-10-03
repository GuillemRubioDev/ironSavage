'use client';

import {useEffect} from 'react';
import {clearPendingEvents, flushPendingEvents, GA_MEASUREMENT_ID} from '@/platform/analytics/gtag';
import {useCookieConsent} from '@/site/cookie-consent/consent-context';

/**
 * Carga Google Analytics 4 solo después de que el visitante acepte la categoría de
 * cookies «analíticas» (AEPD: nada de cookies analíticas antes del consentimiento), y
 * lo vuelve a apagar (borrando sus cookies) si lo retira desde «Configurar cookies».
 * No pinta nada; sin NEXT_PUBLIC_GA_ID no hace nada en absoluto (desarrollo, o
 * producción antes de crear la propiedad).
 *
 * Consent Mode v2: las señales publicitarias se deniegan siempre; la tienda solo
 * mide, no hace publicidad con Google. Las páginas vistas en navegaciones del lado
 * del cliente las envía la medición mejorada de GA4 («cambios de página según el
 * historial del navegador», activa por defecto en el flujo de datos de GA4).
 */
export function GoogleAnalytics() {
    const {consent, hasResponded} = useCookieConsent();
    const granted = consent.analytics;

    useEffect(() => {
        if (!GA_MEASUREMENT_ID) {
            return;
        }
        const disableFlag = `ga-disable-${GA_MEASUREMENT_ID}`;
        const flags = window as unknown as Record<string, unknown>;

        if (granted) {
            flags[disableFlag] = false;
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', {analytics_storage: 'granted'});
                flushPendingEvents();
                return;
            }
            window.dataLayer = window.dataLayer ?? [];
            // gtag.js necesita el objeto `arguments` real, no un array rest.
            window.gtag = function gtag() {
                // eslint-disable-next-line prefer-rest-params
                window.dataLayer!.push(arguments);
            };
            window.gtag('consent', 'default', {
                analytics_storage: 'granted',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
            });
            window.gtag('js', new Date());
            window.gtag('config', GA_MEASUREMENT_ID);
            flushPendingEvents();

            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
            document.head.appendChild(script);
        } else if (hasResponded) {
            // Solo cuando ya se ha leído la respuesta guardada: en el primer render el
            // consentimiento aún es el «no» por defecto, y los eventos en cola de la
            // página deben sobrevivir hasta saberlo.
            clearPendingEvents();
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', {analytics_storage: 'denied'});
                // Impide que gtag.js envíe nada más en esta sesión de página.
                flags[disableFlag] = true;
                deleteGoogleAnalyticsCookies();
            }
        }
    }, [granted, hasResponded]);

    return null;
}

/** Borra _ga / _ga_<id> del host actual y sus dominios superiores. */
function deleteGoogleAnalyticsCookies() {
    const names = document.cookie
        .split(';')
        .map((c) => c.trim().split('=')[0])
        .filter((name) => name === '_ga' || name.startsWith('_ga_') || name === '_gid');
    const hostParts = window.location.hostname.split('.');
    const domains = hostParts.map((_, i) => hostParts.slice(i).join('.')).filter((d) => d.includes('.') || d === 'localhost');
    for (const name of names) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
        for (const domain of domains) {
            document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
        }
    }
}
