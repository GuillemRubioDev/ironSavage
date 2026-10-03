"use client";

import {CookieConsentProvider} from "./consent-context";
import {CookieBanner} from "./cookie-banner";
import {CookiePreferencesDialog} from "./cookie-preferences-dialog";
import {GoogleAnalytics} from "@/site/analytics/google-analytics";

/** Mounts the whole consent system once at the root layout: the context,
 * the first-layer banner, the preferences dialog it and the footer's
 * "Cookie Settings" link both open, and the trackers that depend on it. */
export function CookieConsentRoot({children}: {children: React.ReactNode}) {
    return (
        <CookieConsentProvider>
            {children}
            <CookieBanner />
            <CookiePreferencesDialog />
            <GoogleAnalytics />
        </CookieConsentProvider>
    );
}
