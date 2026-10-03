"use client";

import {useEffect, useRef} from "react";
import {cn} from "@/lib/utils";

/**
 * Parallax de scroll barato: un único listener de scroll pasivo (coste compartido
 * entre todas las capas montadas; cada una solo hace un getBoundingClientRect y
 * escribe una variable CSS, ambas cosas triviales), limitado con rAF y con transform
 * solo por GPU (ver `.parallax-layer` en globals.css). Sin librería de animación.
 * Con prefers-reduced-motion no se engancha nada y la capa se muestra estática.
 */
export function ParallaxLayer({
    speed = 0.15,
    className,
    children,
}: {
    speed?: number;
    className?: string;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        let ticking = false;
        const update = () => {
            const rect = el.getBoundingClientRect();
            const viewportCenter = window.innerHeight / 2;
            const elementCenter = rect.top + rect.height / 2;
            el.style.setProperty("--parallax-offset", String((viewportCenter - elementCenter) * speed));
            ticking = false;
        };
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", onScroll, {passive: true});
        window.addEventListener("resize", onScroll, {passive: true});
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, [speed]);

    return (
        <div ref={ref} className={cn("parallax-layer", className)}>
            {children}
        </div>
    );
}
