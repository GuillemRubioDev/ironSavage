'use client';

import {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';

const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID;
/** Tiempo fuera de la app (otra pestaña, app en segundo plano) a partir del cual se comprueba al volver. */
const MIN_HIDDEN_MS = 30_000;
/** Comprobación periódica mientras la app está abierta y visible. */
const POLL_MS = 5 * 60_000;
/** Lo que dura el aviso antes de recargar. */
const RELOAD_DELAY_MS = 4_000;
const UPDATED_FLAG = 'iron-savage-app-updated';

async function fetchDeployedBuild(): Promise<string | null> {
    try {
        const res = await fetch('/api/version', {cache: 'no-store'});
        if (!res.ok) return null;
        const data = (await res.json()) as {buildId?: string | null};
        return data.buildId ?? null;
    } catch {
        return null;
    }
}

/**
 * Mantiene al día la tienda abierta, sobre todo la "app" instalada en el móvil, que
 * el sistema reanuda sin recargar y seguiría mostrando lo que tenía en memoria:
 *   - Al volver a la app tras más de 30 s fuera, y cada 5 min mientras está
 *     visible, compara su compilación con la desplegada (/api/version).
 *   - Si hay una versión nueva: aviso arriba unos segundos y recarga completa; tras
 *     recargar, aviso de "Tienda actualizada". En el checkout no recarga sola (se
 *     perdería lo que se está rellenando): solo ofrece un botón para actualizar.
 *   - Si no la hay: router.refresh() vuelve a pedir los datos al servidor, así se
 *     ven productos, precios o banners cambiados hace un momento.
 * No pinta nada.
 */
export function AppFreshness() {
    const t = useTranslations('AppUpdate');
    const router = useRouter();
    const hiddenAt = useRef<number | null>(null);
    const reloading = useRef(false);

    useEffect(() => {
        try {
            if (sessionStorage.getItem(UPDATED_FLAG)) {
                sessionStorage.removeItem(UPDATED_FLAG);
                toast.success(t('updated'), {position: 'top-center', duration: 4500});
            }
        } catch {
            // Sin sessionStorage: simplemente no se muestra el aviso posterior.
        }
    }, [t]);

    useEffect(() => {
        if (!CURRENT_BUILD) return;

        const reload = () => {
            try {
                sessionStorage.setItem(UPDATED_FLAG, '1');
            } catch {
                // Se recarga igual.
            }
            window.location.reload();
        };

        /** Devuelve true si hay una versión nueva (y ya se está avisando). */
        const checkForNewVersion = async (): Promise<boolean> => {
            if (reloading.current) return true;
            const deployed = await fetchDeployedBuild();
            if (!deployed || deployed === CURRENT_BUILD) return false;
            reloading.current = true;
            if (window.location.pathname.includes('/checkout')) {
                toast.info(t('newVersionManual'), {
                    position: 'top-center',
                    duration: Infinity,
                    action: {label: t('refresh'), onClick: reload},
                });
            } else {
                toast.info(t('newVersion'), {position: 'top-center', duration: RELOAD_DELAY_MS + 500});
                window.setTimeout(reload, RELOAD_DELAY_MS);
            }
            return true;
        };

        const onVisibilityChange = async () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt.current = Date.now();
                return;
            }
            const awayFor = hiddenAt.current ? Date.now() - hiddenAt.current : 0;
            hiddenAt.current = null;
            if (awayFor < MIN_HIDDEN_MS) return;
            const isNewVersion = await checkForNewVersion();
            if (!isNewVersion) router.refresh();
        };

        // pageshow con persisted: la página vuelve de la caché "atrás/adelante" del navegador.
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                void checkForNewVersion().then(isNew => !isNew && router.refresh());
            }
        };

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') void checkForNewVersion();
        }, POLL_MS);

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pageshow', onPageShow);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, [router, t]);

    return null;
}
