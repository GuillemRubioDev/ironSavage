'use client';

import {useEffect} from 'react';

/**
 * Bloquea el zoom con dos dedos en iOS Safari, que ignora `user-scalable=no` y
 * `maximum-scale=1` del viewport desde iOS 10 (Chrome Android sí los respeta; ver
 * site/locale-layout.tsx). Junto con `touch-action: pan-x pan-y` (globals.css) basta
 * con anular los eventos de gesto de WebKit, que solo existen en Safari y solo se
 * disparan con la pinza: el desplazamiento y los toques no se tocan. A propósito no
 * se escucha touchmove: un listener no pasivo haría esperar al navegador en cada
 * scroll táctil.
 */
export function NoPinchZoom() {
    useEffect(() => {
        const preventGesture = (event: Event) => event.preventDefault();
        document.addEventListener('gesturestart', preventGesture, {passive: false});
        document.addEventListener('gesturechange', preventGesture, {passive: false});
        return () => {
            document.removeEventListener('gesturestart', preventGesture);
            document.removeEventListener('gesturechange', preventGesture);
        };
    }, []);
    return null;
}
