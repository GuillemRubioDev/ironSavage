"use client";

import {CookieConsentProvider} from "./consent-context";
import {CookieBanner} from "./cookie-banner";
import {CookiePreferencesDialog} from "./cookie-preferences-dialog";

/** Mounts the whole consent system once at the root layout: the context,
 * the first-layer banner, and the preferences dialog it and the footer's
 * "Cookie Settings" link both open. */
export function CookieConsentRoot({children}: {children: React.ReactNode}) {
    return (
        <CookieConsentProvider>
            {children}
            <CookieBanner />
            <CookiePreferencesDialog />
        </CookieConsentProvider>
    );
}
