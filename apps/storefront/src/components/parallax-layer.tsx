"use client";

import {useEffect, useRef} from "react";
import {cn} from "@/lib/utils";

/**
 * Cheap scroll parallax: one passive scroll listener (shared cost across
 * however many layers are mounted — each just does a getBoundingClientRect
 * + a CSS custom-property write, both trivial), rAF-throttled, GPU-only
 * transform (see `.parallax-layer` in globals.css). No animation library.
 * Skips attaching anything at all under prefers-reduced-motion — the layer
 * just renders static.
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
