import type {ReactNode} from 'react';

/** Franja oscura de marca: cabecera de listados y bloques de marca. */
export function BrandBand({eyebrow, title, description, watermark, children}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    watermark?: string;
    children?: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden bg-brand text-brand-fg">
            {watermark && (
                <span aria-hidden="true" className="text-display pointer-events-none absolute -top-6 right-4 select-none text-[11rem] text-white/[.04]">
                    {watermark}
                </span>
            )}
            <div className="container relative mx-auto px-4 py-8 md:py-10">
                {eyebrow && <div className="text-xs text-brand-muted">{eyebrow}</div>}
                <h1 className="mt-2 text-5xl md:text-6xl">{title}</h1>
                {description && <p className="mt-2 max-w-2xl text-sm text-brand-muted">{description}</p>}
                {children}
            </div>
        </section>
    );
}
