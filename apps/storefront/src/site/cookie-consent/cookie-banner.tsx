"use client";

import {useTranslations} from "next-intl";
import {Button} from "@/components/ui/button";
import {useCookieConsent} from "./consent-context";

export function CookieBanner() {
    const t = useTranslations("Cookies.banner");
    const {hasResponded, acceptAll, rejectAll, openPreferences} = useCookieConsent();

    if (hasResponded) return null;

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label={t("title")}
            className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.15)]"
        >
            <div className="container mx-auto flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                    <p className="font-display font-semibold uppercase tracking-tight text-sm">{t("title")}</p>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t("description")}</p>
                </div>
                {/* Accept/reject carry equal visual weight on purpose — neither
                    is de-emphasized relative to the other. */}
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
