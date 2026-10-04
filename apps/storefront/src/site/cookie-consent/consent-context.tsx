"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";

export type ConsentCategory = "analytics" | "marketing";

export interface ConsentState {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
}

/**
 * La respuesta del banner se guarda en una cookie propia (técnica, exenta de
 * consentimiento), no en localStorage: así, si el visitante borra las cookies, el
 * banner vuelve a salir, que es lo que espera. Caduca a los 12 meses para volver a
 * preguntar (la AEPD recomienda no pasar de 24). Subir STORAGE_VERSION vuelve a
 * pedir el consentimiento a todos, p. ej. al añadir una categoría o un proveedor.
 */
const STORAGE_KEY = "iron-savage-cookie-consent";
const STORAGE_VERSION = 1;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const DEFAULT_CONSENT: ConsentState = {
    necessary: true,
    analytics: false,
    marketing: false,
};

interface StoredConsent {
    version: number;
    consent: ConsentState;
}

function readCookie(name: string): string | null {
    const prefix = `${name}=`;
    const entry = document.cookie.split("; ").find(part => part.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
}

function readStoredConsent(): ConsentState | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = readCookie(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredConsent;
        if (parsed.version !== STORAGE_VERSION) return null;
        return {...DEFAULT_CONSENT, ...parsed.consent, necessary: true};
    } catch {
        return null;
    }
}

function writeStoredConsent(consent: ConsentState) {
    const value = encodeURIComponent(JSON.stringify({version: STORAGE_VERSION, consent} satisfies StoredConsent));
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${STORAGE_KEY}=${value}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    try {
        // Versiones anteriores lo guardaban en localStorage: se limpia.
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Sin localStorage no hay nada que limpiar.
    }
}

interface CookieConsentContextValue {
    consent: ConsentState;
    /** Sin determinar hasta que el cliente se monta y lee localStorage: nunca supongas
     * que «aún sin respuesta» significa consentimiento concedido. */
    hasResponded: boolean;
    isPreferencesOpen: boolean;
    acceptAll: () => void;
    rejectAll: () => void;
    savePreferences: (categories: Pick<ConsentState, "analytics" | "marketing">) => void;
    openPreferences: () => void;
    closePreferences: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({children}: {children: React.ReactNode}) {
    const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
    const [hasResponded, setHasResponded] = useState(false);
    const [isPreferencesOpen, setPreferencesOpen] = useState(false);

    useEffect(() => {
        const stored = readStoredConsent();
        if (stored) {
            setConsent(stored);
            setHasResponded(true);
        }
    }, []);

    const persist = useCallback((next: ConsentState) => {
        setConsent(next);
        setHasResponded(true);
        writeStoredConsent(next);
        setPreferencesOpen(false);
    }, []);

    const acceptAll = useCallback(() => persist({necessary: true, analytics: true, marketing: true}), [persist]);
    const rejectAll = useCallback(() => persist({necessary: true, analytics: false, marketing: false}), [persist]);
    const savePreferences = useCallback(
        (categories: Pick<ConsentState, "analytics" | "marketing">) =>
            persist({necessary: true, ...categories}),
        [persist],
    );
    const openPreferences = useCallback(() => setPreferencesOpen(true), []);
    const closePreferences = useCallback(() => setPreferencesOpen(false), []);

    const value = useMemo<CookieConsentContextValue>(
        () => ({consent, hasResponded, isPreferencesOpen, acceptAll, rejectAll, savePreferences, openPreferences, closePreferences}),
        [consent, hasResponded, isPreferencesOpen, acceptAll, rejectAll, savePreferences, openPreferences, closePreferences],
    );

    return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
    const ctx = useContext(CookieConsentContext);
    if (!ctx) throw new Error("useCookieConsent must be used within CookieConsentProvider");
    return ctx;
}

/**
 * Barrera para la interfaz de analítica/marketing: pinta los hijos solo cuando el
 * visitante ha concedido esa categoría. (Google Analytics reacciona directamente a
 * `consent`, ver site/analytics/google-analytics.tsx, porque también tiene que
 * apagarse cuando se retira el consentimiento.)
 */
export function ConsentGate({category, children}: {category: ConsentCategory; children: React.ReactNode}) {
    const {consent} = useCookieConsent();
    if (!consent[category]) return null;
    return <>{children}</>;
}
