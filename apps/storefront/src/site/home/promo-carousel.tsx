'use client';

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';
import {useLocale, useTranslations} from 'next-intl';
import {Pause, Play} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi} from '@/components/ui/carousel';
import {ParallaxLayer} from '@/components/parallax-layer';
import {AnimatedWordmark, LogoWordCrop} from '@/components/brand/logo';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import type {Locale} from '@/platform/i18n/routing';

export interface PromoBanner {
    id: string;
    titleEs: string;
    titleEn: string;
    subtitleEs?: string | null;
    subtitleEn?: string | null;
    ctaLabelEs: string;
    ctaLabelEn: string;
    href: string;
    align: string;
    imageLayout: string;
    image?: {preview: string} | null;
}

const AUTOPLAY_DELAY_MS = 6000;
const LETTER_STEP_MS = 35;

/** Una letra por span, escalonadas con animation-delay: el efecto de «formarse».
 * `startIndex` continúa la secuencia entre varios grupos de palabras (p. ej. título y
 * luego destacado) para que la aparición se vea como un único movimiento continuo. */
function AnimatedLetters({text, startIndex, baseDelayMs = 0}: {text: string; startIndex: number; baseDelayMs?: number}) {
    return (
        <>
            {Array.from(text).map((char, i) => (
                <span
                    key={startIndex + i}
                    className="inline-block animate-letter-in"
                    style={{animationDelay: `${baseDelayMs + (startIndex + i) * LETTER_STEP_MS}ms`}}
                >
                    {char === ' ' ? ' ' : char}
                </span>
            ))}
        </>
    );
}

// La aparición del logo (AnimatedWordmark) va primero y dura ~1060 ms (IRON de 0 a
// 800 ms, SAVAGE de 260 a 1060 ms): las letras del título empiezan justo antes de que
// termine, para un relevo ágil en vez de una pausa muerta.
const TITLE_BASE_DELAY_MS = 900;
const LOGO_WIPE_DURATION_MS = 800;

function buildAnimatedHeroTitle(title: string, highlight: string) {
    const titleLength = Array.from(title).length;
    const titleLastLetterDelay = TITLE_BASE_DELAY_MS + (titleLength - 1) * LETTER_STEP_MS;

    // Cuando la palabra destacada ES «Savage», se pinta con la tipografía del logo real
    // (la misma técnica que AnimatedWordmark, con un recorte más grande) en vez de la
    // fuente de títulos normal, por coherencia de marca, como se pidió. Cualquier otra
    // palabra usa letras animadas normales, porque solo esa tiene arte a juego.
    const useLogoTypography = highlight.trim().toUpperCase() === 'SAVAGE';

    if (useLogoTypography) {
        const highlightRevealDelay = titleLastLetterDelay + 250;
        const afterHighlightDelay = highlightRevealDelay + LOGO_WIPE_DURATION_MS;
        const subtitleDelay = afterHighlightDelay + 150;
        const buttonsDelay = subtitleDelay + 150;

        return {
            heading: (
                <h1
                    // El recorte de SAVAGE es una imagen de proporción fija (~5,36:1) cuyo
                    // tamaño sale solo del font-size de este elemento (alto 1.15em, el ancho
                    // sale de la proporción). Con text-6xl fijo (60px) su ancho (~370px)
                    // supera el espacio disponible en pantallas de menos de ~430px y el
                    // overflow-hidden de la diapositiva lo cortaba. Un clamp fluido lo deja
                    // en los 60px originales a partir de ~430px (igual que antes) y lo
                    // reduce de forma continua por debajo para que siempre quepa.
                    className="text-display text-[clamp(2.5rem,14vw,3.75rem)] md:text-8xl lg:text-9xl font-bold text-white flex flex-wrap items-center justify-center gap-x-4 gap-y-2 [transform:translateZ(0)]"
                    aria-label={`${title} ${highlight}`}
                >
                    {/* En el arte real del logo no hay ninguna «T» («IRON SAVAGE» no tiene
                     * T), y las letras reales tampoco se pueden separar limpiamente:
                     * esta fuente propia es una cursiva estrecha con letras solapadas
                     * (comprobado analizando los píxeles: dentro de «IRON» ninguna
                     * columna queda casi vacía entre letras), así que recortar una
                     * letra corta a su vecina, el mismo problema que la separación
                     * IRON/SAVAGE pero un nivel más abajo. Por eso se usa una fuente
                     * angulosa distinta pero muy parecida (Black Ops One, una fuente
                     * de estarcido militar con los mismos remates en corte diagonal que
                     * el logo real) en vez de calcar letras a mano o disfrazar la
                     * fuente normal con un filtro de desgaste (se probó: solo ensucia
                     * los bordes y no arregla la forma de las letras, que era lo que no
                     * encajaba).
                     * `font-style: oblique` (no `transform: skewX`): un transform en
                     * este contenedor inclina la caja inline-block de cada letra, que
                     * ya se anima por separado, y que cajas vecinas redondeen a bordes
                     * subpíxel algo distintos con esa inclinación es justo lo que se
                     * veía como finas separaciones entre letras. Oblique forma parte
                     * del propio trazado del texto, así que no puede haber esas líneas. */}
                    <span
                        aria-hidden="true"
                        className="whitespace-nowrap [font-family:var(--font-brand-display)] [font-style:oblique_10deg]"
                    >
                        <AnimatedLetters text={title} startIndex={0} baseDelayMs={TITLE_BASE_DELAY_MS} />
                    </span>
                    <LogoWordCrop
                        word="savage"
                        revealDelayMs={highlightRevealDelay}
                        className="h-[1.15em]"
                        style={{verticalAlign: 'middle'}}
                    />
                </h1>
            ),
            subtitleDelay,
            buttonsDelay,
        };
    }

    const highlightStart = titleLength + 1; // +1 por el espacio entre las dos palabras
    const totalLetters = highlightStart + Array.from(highlight).length;
    const lastLetterDelay = TITLE_BASE_DELAY_MS + (totalLetters - 1) * LETTER_STEP_MS;
    const subtitleDelay = lastLetterDelay + 280;
    const buttonsDelay = subtitleDelay + 140;

    return {
        heading: (
            <h1 className="text-display text-6xl md:text-8xl lg:text-9xl font-bold text-white" aria-label={`${title} ${highlight}`}>
                <span aria-hidden="true" className="whitespace-nowrap">
                    <AnimatedLetters text={title} startIndex={0} baseDelayMs={TITLE_BASE_DELAY_MS} />
                </span>{' '}
                <span aria-hidden="true" className="hero-glow text-primary whitespace-nowrap">
                    <AnimatedLetters text={highlight} startIndex={highlightStart} baseDelayMs={TITLE_BASE_DELAY_MS} />
                </span>
            </h1>
        ),
        subtitleDelay,
        buttonsDelay,
    };
}

const ALIGN_CLASSES: Record<'left' | 'center' | 'right', string> = {
    left: 'items-center text-left mr-auto',
    center: 'items-center text-center mx-auto',
    right: 'items-end text-right ml-auto',
};

function PromoSlideContent({
    title,
    subtitle,
    ctaLabel,
    href,
    align = 'left',
}: {
    title: string;
    subtitle?: string;
    ctaLabel: string;
    href: string;
    align?: 'left' | 'center' | 'right';
}) {
    return (
        <div className={cn('relative flex max-w-xl flex-col gap-4 px-6', ALIGN_CLASSES[align])}>
            <h2 className="text-display text-4xl md:text-6xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-lg md:text-xl text-white/85 leading-relaxed">{subtitle}</p>}
            <div>
                <Button render={<Link href={href} />} nativeButton={false} size="lg" className="text-base">
                    {ctaLabel}
                </Button>
            </div>
        </div>
    );
}

function HeroContent({
    heroTitle,
    heroTitleHighlight,
    heroSubtitle,
    heroCta,
    heroCtaSecondary,
}: {
    heroTitle: string;
    heroTitleHighlight: string;
    heroSubtitle: string;
    heroCta: string;
    heroCtaSecondary: string;
}) {
    const {heading, subtitleDelay, buttonsDelay} = buildAnimatedHeroTitle(heroTitle, heroTitleHighlight);

    return (
        <div className="max-w-4xl mx-auto text-center space-y-6 select-none cursor-default pointer-events-none [transform:translateZ(0)]">
            {/* El contenido puramente decorativo (logo, título, subtítulo) ignora por
             * completo el ratón: pasar o hacer clic sobre una capa con máscara y
             * brillo obliga al navegador a repintarla, y eso dejaba ver las finas
             * líneas. Sin detección de puntero aquí no hay nada que repintar al
             * interactuar. Los botones de abajo vuelven a aceptar eventos de
             * puntero porque tienen que poder pulsarse. */}
            <AnimatedWordmark className="h-8 md:h-10 lg:h-12 mx-auto mb-2" />
            {heading}
            <p
                className="animate-fade-up text-xl md:text-3xl text-white/80 max-w-2xl mx-auto"
                style={{animationDelay: `${subtitleDelay}ms`}}
            >
                {heroSubtitle}
            </p>
            <div
                className="animate-pop-in pointer-events-auto flex flex-col sm:flex-row gap-4 justify-center pt-2"
                style={{animationDelay: `${buttonsDelay}ms`}}
            >
                <Button render={<Link href="/productos" />} nativeButton={false} size="lg" className="min-w-[200px] text-base">
                    {heroCta}
                </Button>
                <Button
                    render={<Link href="/productos" />}
                    nativeButton={false}
                    variant="outline"
                    size="lg"
                    className="min-w-[200px] text-base border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                    {heroCtaSecondary}
                </Button>
            </div>
        </div>
    );
}

function BannerSlide({banner, locale}: {banner: PromoBanner; locale: Locale}) {
    const title = locale === 'es' ? banner.titleEs : banner.titleEn;
    const subtitle = (locale === 'es' ? banner.subtitleEs : banner.subtitleEn) ?? undefined;
    const ctaLabel = locale === 'es' ? banner.ctaLabelEs : banner.ctaLabelEn;
    const align = (banner.align as 'left' | 'center' | 'right') ?? 'left';

    const imageEl = banner.image ? (
        <Image src={banner.image.preview} alt="" fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
    ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_30%,oklch(0.577_0.245_27.325_/_18%),transparent)]" />
    );

    if (banner.imageLayout === 'left' || banner.imageLayout === 'right') {
        const imageOnRight = banner.imageLayout === 'right';
        return (
            <div className="relative flex min-h-[70vh] md:min-h-[80vh] flex-col md:flex-row overflow-hidden bg-background">
                <div className={cn('relative h-64 w-full md:h-auto md:w-1/2', imageOnRight && 'md:order-2')}>{imageEl}</div>
                <div
                    className={cn(
                        'relative flex w-full flex-1 items-center overflow-hidden bg-[oklch(0.13_0.004_260)] px-6 py-10 md:w-1/2 md:py-0',
                        imageOnRight && 'md:order-1',
                    )}
                >
                    {/* Fondo fijo casi negro (no los tokens que cambian con el tema claro/
                     * oscuro) para que el texto blanco se lea bien sea cual sea el modo
                     * de la tienda, igual que la diapositiva principal. */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,oklch(0.577_0.245_27.325_/_18%),transparent)]" />
                    <div className="relative w-full">
                        <PromoSlideContent title={title} subtitle={subtitle} ctaLabel={ctaLabel} href={banner.href} align={align} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-[70vh] md:min-h-[80vh] items-center overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary">
            {imageEl}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />
            <div className="container relative mx-auto px-4">
                <PromoSlideContent title={title} subtitle={subtitle} ctaLabel={ctaLabel} href={banner.href} align={align} />
            </div>
        </div>
    );
}

export function PromoCarousel({
    heroTitle,
    heroTitleHighlight,
    heroSubtitle,
    heroCta,
    heroCtaSecondary,
    banners,
}: {
    heroTitle: string;
    heroTitleHighlight: string;
    heroSubtitle: string;
    heroCta: string;
    heroCtaSecondary: string;
    banners: PromoBanner[];
}) {
    const locale = useLocale() as Locale;
    const t = useTranslations('Home.carousel');
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    // Se incrementa cada vez que la diapositiva principal (índice 0) vuelve a estar
    // activa al dar la vuelta el carrusel: volver a montar el título animado con `key`
    // repite la entrada de las letras en vez de mostrarla una sola vez.
    const [heroReplayKey, setHeroReplayKey] = useState(0);
    const reducedMotionRef = useRef(false);

    const autoplay = useRef(
        Autoplay({delay: AUTOPLAY_DELAY_MS, stopOnMouseEnter: true, stopOnInteraction: false}),
    );

    useEffect(() => {
        reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotionRef.current) {
            autoplay.current.stop();
            setIsPlaying(false);
        }
    }, []);

    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on('select', () => {
            const index = api.selectedScrollSnap();
            setCurrent(index);
            if (index === 0) {
                setHeroReplayKey(key => key + 1);
            }
        });
    }, [api]);

    const slideCount = 1 + banners.length;

    const togglePlay = () => {
        if (isPlaying) {
            autoplay.current.stop();
            setIsPlaying(false);
        } else {
            autoplay.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <section className="relative">
            <Carousel
                setApi={setApi}
                opts={{loop: true}}
                plugins={[autoplay.current]}
                className="group"
            >
                <div role="region" aria-label={t('regionLabel')}>
                    <CarouselContent className="ml-0">
                        {/* Diapositiva 1: mensaje de marca, la portada principal, siempre la primera. */}
                        <CarouselItem className="pl-0">
                            <div className="relative flex min-h-[75vh] md:min-h-[85vh] items-center overflow-hidden bg-[oklch(0.13_0.004_260)] pb-16 md:pb-20">
                                <ParallaxLayer speed={0.2} className="absolute inset-0">
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,oklch(0.577_0.245_27.325_/_22%),transparent)]" />
                                </ParallaxLayer>
                                <ParallaxLayer speed={0.08} className="absolute inset-0">
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.04]" />
                                </ParallaxLayer>
                                <div className="container relative mx-auto px-4">
                                    <HeroContent
                                        key={heroReplayKey}
                                        heroTitle={heroTitle}
                                        heroTitleHighlight={heroTitleHighlight}
                                        heroSubtitle={heroSubtitle}
                                        heroCta={heroCta}
                                        heroCtaSecondary={heroCtaSecondary}
                                    />
                                </div>
                            </div>
                        </CarouselItem>

                        {/* Diapositivas 2 y siguientes: promociones gestionadas desde el dashboard (Marketing > Banners de portada) */}
                        {banners.map((banner) => (
                            <CarouselItem key={banner.id} className="pl-0">
                                <BannerSlide banner={banner} locale={locale} />
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </div>

                <CarouselPrevious
                    aria-label={t('previous')}
                    className="left-4 border-white/30 bg-black/30 text-white hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <CarouselNext
                    aria-label={t('next')}
                    className="right-4 border-white/30 bg-black/30 text-white hover:bg-black/50 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                />
            </Carousel>

            {/* Puntos + reproducir/pausar */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="flex items-center gap-2">
                    {Array.from({length: slideCount}).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => api?.scrollTo(i)}
                            aria-label={t('goToSlide', {number: i + 1})}
                            aria-current={current === i}
                            className={cn(
                                'h-2 rounded-full transition-all',
                                current === i ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70',
                            )}
                        />
                    ))}
                </div>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={togglePlay}
                    aria-label={isPlaying ? t('pause') : t('play')}
                    className="text-white hover:bg-white/10 hover:text-white"
                >
                    {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                </Button>
            </div>
        </section>
    );
}
