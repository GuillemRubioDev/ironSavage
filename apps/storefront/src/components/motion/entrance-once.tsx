'use client';

import {useEffect} from 'react';

// Animaciones de entrada que solo deben verse la primera vez (ver globals.css).
const ENTRANCES = '.stagger > *, .animate-hero-in, .animate-hero-zoom';

/**
 * Next conserva ocultas (display: none) las páginas ya visitadas para volver a ellas al
 * instante, y el navegador reinicia las animaciones CSS de un elemento cada vez que
 * vuelve a mostrarse. Sin esto, cada vuelta a la portada repetía la entrada
 * escalonada del banner y de las categorías (~0,5 s más tras el cambio de página).
 * Marca con data-animado cada elemento cuya entrada ya terminó; el CSS no la repite.
 */
export function EntranceOnce() {
    useEffect(() => {
        const onEnd = (event: AnimationEvent) => {
            const el = event.target;
            if (el instanceof Element && el.matches(ENTRANCES)) el.setAttribute('data-animado', '');
        };
        document.addEventListener('animationend', onEnd);
        return () => document.removeEventListener('animationend', onEnd);
    }, []);
    return null;
}
