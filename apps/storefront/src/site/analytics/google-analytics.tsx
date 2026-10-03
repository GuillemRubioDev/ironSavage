'use client';

import {useEffect} from 'react';
import {clearPendingEvents, flushPendingEvents, GA_MEASUREMENT_ID} from '@/platform/analytics/gtag';
import {useCookieConsent} from '@/site/cookie-consent/consent-context';

/**
 * Loads Google Analytics 4 only after the visitor accepts the "analytics"
 * cookie category (AEPD: no analytics cookies before consent), and turns it
 * off again — deleting its cookies — if they withdraw it from "Configurar
 * cookies". Renders nothing; does nothing at all without NEXT_PUBLIC_GA_ID
 * (development, or production before the property exists).
 *
 * Consent Mode v2: advertising signals are always denied — this shop only
 * measures, it doesn't advertise with Google. Page views on client-side
 * navigations are sent by GA4's enhanced measurement ("page changes based on
 * browser history events", on by default in the GA4 data stream).
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
            // gtag.js requires the real `arguments` object, not a rest array.
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
            // Only once the stored answer has been read: on the first render
            // consent is still the default "no", and events queued by the page
            // must survive until we know.
            clearPendingEvents();
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', {analytics_storage: 'denied'});
                // Stops gtag.js from sending anything else in this page session.
                flags[disableFlag] = true;
                deleteGoogleAnalyticsCookies();
            }
        }
    }, [granted, hasResponded]);

    return null;
}

/** Removes _ga / _ga_<id> for the current host and its parent domains. */
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
