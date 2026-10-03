"use client";

import {CookieConsentProvider} from "./consent-context";
import {CookieBanner} from "./cookie-banner";
import {CookiePreferencesDialog} from "./cookie-preferences-dialog";
import {GoogleAnalytics} from "@/site/analytics/google-analytics";

/** Monta una vez en el layout raíz todo el sistema de consentimiento: el contexto,
 * el banner de primera capa, el diálogo de preferencias (que abren el banner y el
 * enlace «Configurar cookies» del pie) y los seguimientos que dependen de él. */
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
