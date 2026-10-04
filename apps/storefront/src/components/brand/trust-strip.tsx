import type {LucideIcon} from 'lucide-react';

/** Franja de confianza: envío, pago seguro, devolución, puntos. Textos según idioma desde quien la usa. */
export function TrustStrip({items}: {items: Array<{icon: LucideIcon; title: string; text: string}>}) {
    return (
        <ul className="grid grid-cols-2 border-y border-border bg-background md:grid-cols-4">
            {items.map(({icon: Icon, title, text}) => (
                <li key={title} className="flex items-center gap-3 border-border px-4 py-4 [&:not(:last-child)]:border-r">
                    <Icon className="size-5 shrink-0 text-primary-solid" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground"><b className="block text-sm text-foreground">{title}</b>{text}</span>
                </li>
            ))}
        </ul>
    );
}
