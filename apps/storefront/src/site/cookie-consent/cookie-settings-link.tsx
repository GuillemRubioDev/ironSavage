"use client";

import {useTranslations} from "next-intl";
import {useCookieConsent} from "./consent-context";

/** The persistent "Configurar cookies" entry point required in the footer,
 * for revoking/changing consent after the initial banner is gone. */
export function CookieSettingsLink({className}: {className?: string}) {
    const t = useTranslations("Cookies");
    const {openPreferences} = useCookieConsent();

    return (
        <button type="button" onClick={openPreferences} className={className}>
            {t("settingsLink")}
        </button>
    );
}
