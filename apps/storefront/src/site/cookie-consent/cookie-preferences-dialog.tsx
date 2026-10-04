"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Switch} from "@/components/ui/switch";
import {useCookieConsent} from "./consent-context";

function ConsentRow({
    title,
    description,
    checked,
    disabled,
    onCheckedChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
            <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
        </div>
    );
}

export function CookiePreferencesDialog() {
    const t = useTranslations("Cookies.preferences");
    const {consent, isPreferencesOpen, closePreferences, acceptAll, rejectAll, savePreferences} = useCookieConsent();
    const [analytics, setAnalytics] = useState(consent.analytics);
    const [marketing, setMarketing] = useState(consent.marketing);

    // Al abrir el diálogo, los interruptores vuelven al consentimiento guardado,
    // para que un cambio cerrado sin guardar no se quede.
    useEffect(() => {
        if (isPreferencesOpen) {
            setAnalytics(consent.analytics);
            setMarketing(consent.marketing);
        }
    }, [isPreferencesOpen, consent]);

    return (
        <Dialog open={isPreferencesOpen} onOpenChange={(open) => !open && closePreferences()}>
            {/* En móvil las tres categorías no caben: el diálogo se limita al alto de la
                pantalla, con cabecera y botones fijos y la lista desplazable en medio
                (minmax(0,1fr) deja encoger esa fila por debajo de su contenido). */}
            <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3 overflow-y-auto overscroll-contain -mx-1 px-1">
                    <ConsentRow title={t("necessary.title")} description={t("necessary.description")} checked disabled />
                    <ConsentRow
                        title={t("analytics.title")}
                        description={t("analytics.description")}
                        checked={analytics}
                        onCheckedChange={setAnalytics}
                    />
                    <ConsentRow
                        title={t("marketing.title")}
                        description={t("marketing.description")}
                        checked={marketing}
                        onCheckedChange={setMarketing}
                    />
                </div>

                <DialogFooter className="sm:justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={rejectAll}>
                            {t("rejectAll")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={acceptAll}>
                            {t("acceptAll")}
                        </Button>
                    </div>
                    <Button size="sm" onClick={() => savePreferences({analytics, marketing})}>
                        {t("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
