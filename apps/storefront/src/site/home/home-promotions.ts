import type {StaticImageData} from 'next/image';
import type {Locale} from '@/platform/i18n/routing';

/**
 * Simple local config for the promotional slides shown in the home carousel
 * (site/home/promo-carousel.tsx) — deliberately NOT a plugin/CMS. Meant to
 * be trivial to replace later with data fetched from an admin-managed
 * source (e.g. a Vendure custom entity or plugin): swap this array for a
 * fetch call returning the same shape and nothing else needs to change.
 *
 * `image` is optional — omit it to get an elegant brand-gradient background
 * instead (see promo-carousel.tsx) rather than force a placeholder asset
 * that doesn't exist yet.
 */
export interface HomePromoSlide {
    id: string;
    image?: StaticImageData;
    title: Record<Locale, string>;
    subtitle?: Record<Locale, string>;
    ctaLabel: Record<Locale, string>;
    href: string;
    align?: 'left' | 'center' | 'right';
}

export const homePromoSlides: HomePromoSlide[] = [
    {
        id: 'creatina',
        title: {es: 'Creatina y aminoácidos', en: 'Creatine & amino acids'},
        subtitle: {es: 'Mejora tu fuerza y rendimiento en cada entrenamiento.', en: 'Improve your strength and performance in every session.'},
        ctaLabel: {es: 'Ver creatina', en: 'Shop creatine'},
        href: '/categorias/creatina-y-aminoacidos',
        align: 'left',
    },
    {
        id: 'proteinas',
        title: {es: 'Proteínas', en: 'Protein'},
        subtitle: {es: 'La base de la recuperación muscular, sin rellenos.', en: 'The foundation of muscle recovery, no filler.'},
        ctaLabel: {es: 'Ver proteínas', en: 'Shop protein'},
        href: '/categorias/proteinas',
        align: 'center',
    },
    {
        id: 'pre-entreno',
        title: {es: 'Pre-entreno', en: 'Pre-workout'},
        subtitle: {es: 'Energía y foco cuando más lo necesitas.', en: 'Energy and focus when you need it most.'},
        ctaLabel: {es: 'Ver pre-entreno', en: 'Shop pre-workout'},
        href: '/categorias/pre-entreno',
        align: 'right',
    },
];
