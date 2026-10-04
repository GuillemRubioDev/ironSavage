'use client';

import {useEffect} from 'react';

/**
 * Bloquea el zoom con dos dedos para que la tienda se comporte como una app en el
 * móvil (navegador y PWA instalada). El `viewport` del layout ya pide
 * `user-scalable=no`, pero Safari de iOS lo ignora desde iOS 10, así que aquí se
 * cancelan los propios gestos: `gesture*` (exclusivos de Safari) y cualquier
 * `touchmove` con más de un dedo. El scroll y los carruseles usan un solo dedo y
 * no se ven afectados. No pinta nada.
 */
export function DisablePinchZoom() {
    useEffect(() => {
        const preventGesture = (event: Event) => event.preventDefault();
        const preventMultiTouch = (event: TouchEvent) => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        };

        // passive: false es imprescindible: con listeners pasivos preventDefault no hace nada.
        document.addEventListener('gesturestart', preventGesture, {passive: false});
        document.addEventListener('gesturechange', preventGesture, {passive: false});
        document.addEventListener('touchmove', preventMultiTouch, {passive: false});
        return () => {
            document.removeEventListener('gesturestart', preventGesture);
            document.removeEventListener('gesturechange', preventGesture);
            document.removeEventListener('touchmove', preventMultiTouch);
        };
    }, []);

    return null;
}
