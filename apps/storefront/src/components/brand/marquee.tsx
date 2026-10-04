/**
 * Cinta de avisos en movimiento (zona de marca). Los mensajes se repiten dos veces
 * para que el bucle sea continuo; la segunda copia se oculta a los lectores de
 * pantalla. Con "reducir movimiento" se queda quieta (ver .marquee en globals.css).
 */
export function Marquee({items, label}: {items: string[]; label: string}) {
    if (items.length === 0) return null;
    const row = (hidden: boolean) => (
        <ul aria-hidden={hidden ? 'true' : undefined} className="flex shrink-0 items-center gap-10 pr-10">
            {items.map(item => (
                <li key={item} className="flex items-center gap-10 whitespace-nowrap">
                    {item}
                    <span aria-hidden="true" className="opacity-60">✦</span>
                </li>
            ))}
        </ul>
    );
    return (
        <div aria-label={label} role="region" className="marquee flex h-full items-center overflow-hidden bg-primary-solid text-primary-foreground text-[11px] font-bold uppercase tracking-[.12em]">
            <div className="marquee-track flex w-max">
                {row(false)}
                {row(true)}
            </div>
        </div>
    );
}
