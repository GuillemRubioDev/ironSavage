'use client';

import {useState} from 'react';
import {Pause, Play} from 'lucide-react';

/**
 * Veces que se repiten los mensajes dentro de cada mitad de la cinta. El bucle solo
 * es continuo si una mitad es más ancha que la pantalla: con 4 mensajes una pasada
 * mide ~1000 px, así que ×3 cubre pantallas de hasta ~3000 px sin dejar hueco.
 */
const REPEAT = 3;

/**
 * Cinta de avisos en movimiento (zona de marca). Dos mitades idénticas para un bucle
 * continuo; la segunda se oculta a los lectores de pantalla. Se para al pasar el
 * ratón, al recibir el foco y con el botón de pausa (WCAG 2.2.2), y queda quieta
 * con "reducir movimiento" (ver .marquee en globals.css).
 */
export function Marquee({items, label, pauseLabel}: {
    items: string[];
    label: string;
    /** Nombre fijo del botón; su estado (pausado o no) lo anuncia aria-pressed. */
    pauseLabel: string;
}) {
    const [paused, setPaused] = useState(false);
    if (items.length === 0) return null;
    const repeated = Array.from({length: REPEAT}, () => items).flat();
    const row = (hidden: boolean) => (
        <ul aria-hidden={hidden ? 'true' : undefined} className="flex shrink-0 items-center gap-10 pr-10">
            {repeated.map((item, i) => (
                <li key={`${i}-${item}`} aria-hidden={!hidden && i >= items.length ? 'true' : undefined} className="flex items-center gap-10 whitespace-nowrap">
                    {item}
                    <span aria-hidden="true" className="opacity-60">✦</span>
                </li>
            ))}
        </ul>
    );
    return (
        <div aria-label={label} role="region" data-paused={paused} className="marquee relative flex h-full items-center overflow-hidden bg-primary-solid text-primary-foreground text-[11px] font-bold uppercase tracking-[.12em]">
            <div className="marquee-track flex w-max">
                {row(false)}
                {row(true)}
            </div>
            <button
                type="button"
                aria-pressed={paused}
                aria-label={pauseLabel}
                onClick={() => setPaused(p => !p)}
                className="absolute right-0 top-0 grid h-full w-8 place-items-center bg-primary-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            >
                {paused ? <Play className="size-3" aria-hidden="true" /> : <Pause className="size-3" aria-hidden="true" />}
            </button>
        </div>
    );
}
