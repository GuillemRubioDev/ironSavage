'use client';

import {type CSSProperties, type ReactNode, useEffect, useRef} from 'react';

/**
 * Aparición suave de un bloque al entrar en pantalla. El contenido se pinta visible
 * en el servidor y sin JS: solo cuando el script se ejecuta lo marca como
 * `data-reveal="pending"` (oculto por CSS) y lo pasa a `visible` al entrar en el
 * viewport. Con "reducir movimiento" el CSS lo deja siempre visible.
 */
export function Reveal({
    children,
    className,
    as: Tag = 'div',
    delay = 0,
}: {
    children: ReactNode;
    className?: string;
    as?: 'div' | 'section' | 'li';
    delay?: number;
}) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        // Ya revelado: al volver a una página que Next tenía oculta, el efecto se
        // vuelve a ejecutar y no debe ocultar otra vez lo que ya se vio.
        if (!el || el.dataset.reveal === 'visible') return;
        // Si ya está en pantalla al montar, no se oculta (evita un parpadeo).
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.dataset.reveal = 'visible';
            return;
        }
        el.dataset.reveal = 'pending';
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.dataset.reveal = 'visible';
                    observer.disconnect();
                }
            },
            {rootMargin: '0px 0px -10% 0px'},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag
            ref={ref as never}
            className={['reveal', className].filter(Boolean).join(' ')}
            style={{'--reveal-delay': `${delay}ms`} as CSSProperties}
        >
            {children}
        </Tag>
    );
}
