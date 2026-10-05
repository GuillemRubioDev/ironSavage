"use client";

import {useTranslations} from "next-intl";
import {Button} from "@/components/ui/button";
import {useCookieConsent} from "./consent-context";

export function CookieBanner() {
    const t = useTranslations("Cookies.banner");
    const {hasResponded, isPreferencesOpen, acceptAll, rejectAll, openPreferences} = useCookieConsent();

    // Mientras está abierto el diálogo de preferencias el banner se oculta: va por
    // encima (z-60) y en móvil tapaba la mitad del diálogo, con sus botones.
    if (hasResponded || isPreferencesOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label={t("title")}
            className="vt-cookie-banner fixed inset-x-0 bottom-0 z-[60] max-h-[100dvh] overflow-y-auto overscroll-contain print:hidden border-t border-border bg-card shadow-[0_-4px_24px_rgba(0,0,0,0.15)]"
        >
            <div className="container mx-auto flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                    <p className="font-display font-semibold uppercase tracking-tight text-sm">{t("title")}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t("description")}</p>
                </div>
                {/* Aceptar y rechazar tienen el mismo peso visual a propósito: ninguno
                    se destaca menos que el otro. */}
                <div className="flex flex-col gap-2 sm:flex-row shrink-0">
                    <Button variant="outline" size="default" onClick={openPreferences}>
                        {t("customize")}
                    </Button>
                    <Button variant="secondary" size="default" onClick={rejectAll}>
                        {t("rejectAll")}
                    </Button>
                    <Button variant="default" size="default" onClick={acceptAll}>
                        {t("acceptAll")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
