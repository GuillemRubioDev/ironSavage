'use client';

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Autoplay from 'embla-carousel-autoplay';
import {useLocale, useTranslations} from 'next-intl';
import {Pause, Play} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi} from '@/components/ui/carousel';
import {ParallaxLayer} from '@/components/parallax-layer';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';
import {homePromoSlides} from './home-promotions';
import type {Locale} from '@/platform/i18n/routing';

const AUTOPLAY_DELAY_MS = 6000;

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

export function PromoCarousel({
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
    const locale = useLocale() as Locale;
    const t = useTranslations('Home.carousel');
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
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
        api.on('select', () => setCurrent(api.selectedScrollSnap()));
    }, [api]);

    const slideCount = 1 + homePromoSlides.length;

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
                        {/* Slide 1: brand statement — the site's core hero, always first. */}
                        <CarouselItem className="pl-0">
                            <div className="relative flex min-h-[70vh] md:min-h-[80vh] items-center overflow-hidden bg-[oklch(0.13_0.004_260)]">
                                <ParallaxLayer speed={0.2} className="absolute inset-0">
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,oklch(0.577_0.245_27.325_/_22%),transparent)]" />
                                </ParallaxLayer>
                                <ParallaxLayer speed={0.08} className="absolute inset-0">
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.04]" />
                                </ParallaxLayer>
                                <div className="container relative mx-auto px-4">
                                    <div className="max-w-3xl mx-auto text-center space-y-6">
                                        <h1 className="text-display text-5xl md:text-7xl lg:text-8xl font-bold text-white">
                                            {heroTitle} <span className="text-primary">{heroTitleHighlight}</span>
                                        </h1>
                                        <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto">{heroSubtitle}</p>
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
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
                                </div>
                            </div>
                        </CarouselItem>

                        {/* Slides 2+: promotional/category slides from home-promotions.ts */}
                        {homePromoSlides.map((slide) => (
                            <CarouselItem key={slide.id} className="pl-0">
                                <div className="relative flex min-h-[70vh] md:min-h-[80vh] items-center overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary">
                                    {slide.image ? (
                                        <Image
                                            src={slide.image}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            sizes="100vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_30%_30%,oklch(0.577_0.245_27.325_/_18%),transparent)]" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />
                                    <div className="container relative mx-auto px-4">
                                        <PromoSlideContent
                                            title={slide.title[locale]}
                                            subtitle={slide.subtitle?.[locale]}
                                            ctaLabel={slide.ctaLabel[locale]}
                                            href={slide.href}
                                            align={slide.align}
                                        />
                                    </div>
                                </div>
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

            {/* Dots + play/pause */}
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
