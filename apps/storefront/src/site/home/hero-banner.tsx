import type {CSSProperties} from 'react';
import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import type {PromoBanner} from '@/site/home/banners-data';

type Fallback = {title: string; highlight: string; subtitle: string; cta: string};

const ALIGN: Record<string, string> = {
    left: 'items-start text-left',
    center: 'items-center text-center mx-auto',
    right: 'items-end text-right ml-auto',
};

/** Posición en el escalonado de .stagger (cada hijo entra 60 ms después del anterior). */
const step = (i: number) => ({'--i': i}) as CSSProperties;

/**
 * Banner fijo de la portada: el primer banner activo de Marketing → Banners de portada.
 * Sin banner activo, un banner de marca oscuro con el lema. Titular escalonado
 * (.stagger) y zoom lento de la foto (.animate-hero-zoom); los dos se anulan con
 * "reducir movimiento". Siempre en zona de marca: texto blanco en los dos temas.
 * El relleno inferior grande deja sitio a la fila de categorías, que se superpone.
 */
export function HeroBanner({banner, locale, fallback}: {banner: PromoBanner | null; locale: string; fallback: Fallback}) {
    if (!banner) {
        return (
            <section className="relative overflow-hidden bg-brand text-brand-fg">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_80%_20%,rgb(231_0_11/22%),transparent)]" aria-hidden="true" />
                <div className="container relative mx-auto flex min-h-[60vh] flex-col justify-center gap-5 px-4 pb-28 pt-16 md:min-h-[68vh] md:pb-36">
                    <div className="stagger flex max-w-2xl flex-col items-start gap-5">
                        <h1 style={step(0)} className="text-6xl md:text-8xl">
                            {fallback.title} <span className="text-primary-text">{fallback.highlight}</span>
                        </h1>
                        <p style={step(1)} className="max-w-xl text-lg text-brand-muted md:text-xl">{fallback.subtitle}</p>
                        <div style={step(2)}>
                            <Button render={<Link href="/productos" />} nativeButton={false} size="xl">
                                {fallback.cta} <ArrowRight aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const es = locale === 'es';
    const title = es ? banner.titleEs : banner.titleEn;
    const subtitle = (es ? banner.subtitleEs : banner.subtitleEn) ?? null;
    const cta = es ? banner.ctaLabelEs : banner.ctaLabelEn;
    const align = ALIGN[banner.align] ?? ALIGN.left;
    const side = banner.imageLayout === 'left' || banner.imageLayout === 'right';

    const text = (
        <div className={cn('stagger relative flex max-w-xl flex-col gap-5', align)}>
            <h1 style={step(0)} className="text-6xl md:text-8xl">{title}</h1>
            {subtitle && <p style={step(1)} className="text-lg text-white/80 md:text-xl">{subtitle}</p>}
            <div style={step(2)}>
                <Button render={<Link href={banner.href} />} nativeButton={false} size="xl">
                    {cta} <ArrowRight aria-hidden="true" />
                </Button>
            </div>
        </div>
    );

    if (side) {
        // Foto a un lado (bote de producto): fondo de marca y la foto entera, sin recortar.
        return (
            <section className="relative overflow-hidden bg-brand text-brand-fg">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_70%_at_75%_40%,rgb(231_0_11/20%),transparent)]" aria-hidden="true" />
                <div className="container relative mx-auto grid min-h-[60vh] items-center gap-8 px-4 pb-28 pt-12 md:min-h-[68vh] md:grid-cols-2 md:pb-36">
                    <div className={cn(banner.imageLayout === 'left' && 'md:order-2')}>{text}</div>
                    {banner.image && (
                        <div className="relative aspect-square w-full max-w-md justify-self-center md:max-w-lg">
                            <Image src={banner.image.preview} alt="" fill priority sizes="(min-width: 768px) 40vw, 80vw" className="animate-hero-zoom object-contain drop-shadow-[0_30px_40px_rgb(0_0_0/45%)]" />
                        </div>
                    )}
                </div>
            </section>
        );
    }

    // Foto de fondo a todo el ancho con degradado oscuro hacia el lado del texto.
    return (
        <section className="relative overflow-hidden bg-brand text-brand-fg">
            {banner.image && (
                <Image src={banner.image.preview} alt="" fill priority sizes="100vw" className="animate-hero-zoom object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" aria-hidden="true" />
            <div className="container relative mx-auto flex min-h-[60vh] flex-col justify-center px-4 pb-28 pt-12 md:min-h-[68vh] md:pb-36">
                {text}
            </div>
        </section>
    );
}
