'use client';

import {useEffect, useState} from 'react';

/** Convierte un título en un id de ancla estable ("1. Datos identificativos" → "datos-identificativos"). */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/^\d+[.)]\s*/, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Índice de una página legal: lee los h2 del contenido (#legal-content), les pone un id
 * y lista los enlaces. Así no se tocan los textos legales. Antes de hidratar (o sin
 * JavaScript) no se pinta nada y el texto se lee igual.
 */
export function LegalToc({label}: {label: string}) {
    const [items, setItems] = useState<Array<{id: string; text: string}>>([]);

    useEffect(() => {
        const headings = [...(document.getElementById('legal-content')?.querySelectorAll('h2') ?? [])];
        const used = new Set<string>();
        setItems(headings.map((heading) => {
            let id = heading.id || slugify(heading.textContent ?? '') || 'seccion';
            while (used.has(id)) id = `${id}-1`;
            used.add(id);
            heading.id = id;
            return {id, text: heading.textContent ?? ''};
        }));
    }, []);

    if (!items.length) return null;

    return (
        <nav aria-label={label} className="text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">{label}</p>
            <ol className="space-y-2 border-l border-border">
                {items.map((item) => (
                    <li key={item.id}>
                        <a href={`#${item.id}`} className="-ml-px block border-l-2 border-transparent pl-3 text-muted-foreground transition-colors hover:border-primary-solid hover:text-foreground">
                            {item.text}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
