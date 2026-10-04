'use client';

import {useEffect, useState} from 'react';

const STORAGE_KEY = 'iron-savage-error-recovery';
/** Recargas automáticas de la portada permitidas en ese plazo, para no entrar en bucle si la portada misma falla. */
const MAX_HOME_RELOADS = 2;
const WINDOW_MS = 2 * 60 * 1000;

export type RecoveryMode = 'redirect' | 'reload' | 'none';

function readReloads(): number[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const list = raw ? (JSON.parse(raw) as number[]) : [];
        return list.filter(t => Date.now() - t < WINDOW_MS);
    } catch {
        return [];
    }
}

function rememberReload() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...readReloads(), Date.now()]));
    } catch {
        // Sin sessionStorage (modo privado estricto): se recarga igual, sin límite guardado.
    }
}

/**
 * Recuperación automática de una página de error:
 *   - fuera de la portada → cuenta atrás y vuelta al inicio;
 *   - en la portada → cuenta atrás y recarga, como mucho MAX_HOME_RELOADS veces cada
 *     dos minutos (si sigue fallando se queda quieta con los botones).
 * Navega con recarga completa (no con el router de Next) para salir también de un
 * estado del cliente roto. `cancel()` detiene la cuenta atrás (WCAG 2.2.1: el
 * usuario puede pararla).
 */
export function useAutoRecovery({homeHref, seconds: initialSeconds}: {homeHref: string; seconds: number}) {
    const [mode, setMode] = useState<RecoveryMode>('none');
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        const path = window.location.pathname.replace(/\/$/, '') || '/';
        const isHome = path === (homeHref.replace(/\/$/, '') || '/');
        if (!isHome) {
            setMode('redirect');
        } else if (readReloads().length < MAX_HOME_RELOADS) {
            setMode('reload');
        }
    }, [homeHref]);

    useEffect(() => {
        if (mode === 'none') return;
        if (seconds <= 0) {
            if (mode === 'reload') {
                rememberReload();
                window.location.reload();
            } else {
                window.location.assign(homeHref);
            }
            return;
        }
        const timer = window.setTimeout(() => setSeconds(s => s - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [mode, seconds, homeHref]);

    return {mode, seconds, cancel: () => setMode('none')};
}
