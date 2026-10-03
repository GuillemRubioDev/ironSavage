"use client";

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";

export type ConsentCategory = "analytics" | "marketing";

export interface ConsentState {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
}

const STORAGE_KEY = "iron-savage-cookie-consent";
const STORAGE_VERSION = 1;

const DEFAULT_CONSENT: ConsentState = {
    necessary: true,
    analytics: false,
    marketing: false,
};

interface StoredConsent {
    version: number;
    consent: ConsentState;
}

function readStoredConsent(): ConsentState | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredConsent;
        if (parsed.version !== STORAGE_VERSION) return null;
        return {...DEFAULT_CONSENT, ...parsed.consent, necessary: true};
    } catch {
        return null;
    }
}

function writeStoredConsent(consent: ConsentState) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({version: STORAGE_VERSION, consent} satisfies StoredConsent));
    } catch {
        // Almacenamiento no disponible (modo privado, desactivado): el consentimiento no
        // se guardará entre visitas y el banner volverá a salir la próxima vez.
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
