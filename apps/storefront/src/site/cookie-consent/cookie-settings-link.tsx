"use client";

import {useTranslations} from "next-intl";
import {useCookieConsent} from "./consent-context";

/** El acceso permanente «Configurar cookies» que debe estar en el pie, para retirar
 * o cambiar el consentimiento cuando el banner inicial ya no está. */
export function CookieSettingsLink({className}: {className?: string}) {
    const t = useTranslations("Cookies");
    const {openPreferences} = useCookieConsent();

    return (
        <button type="button" onClick={openPreferences} className={className}>
            {t("settingsLink")}
        </button>
    );
}
