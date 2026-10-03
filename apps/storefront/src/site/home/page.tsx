import type {Metadata} from "next";
import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {PromoCarousel} from "@/site/home/promo-carousel";
import {getActiveBanners} from "@/site/home/banners-data";
import {CategoriesShowcase} from '@/site/home/categories-showcase';
import {FeaturedProducts} from '@/features/products/featured-products';
import {LoyaltyTeaser} from '@/features/loyalty/loyalty-teaser';
import {LatestNewsSection} from '@/features/news/latest-news-section';
import {DEFAULT_OG_IMAGES, SITE_NAME, buildCanonicalUrl, localizedPath} from "@/config/metadata";
import {BadgeCheck, Tag, Zap} from "lucide-react";
import {getTranslations} from 'next-intl/server';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {routing} from '@/platform/i18n/routing';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const ogLocale = toOgLocale(locale);
    const homeUrl = buildCanonicalUrl(localizedPath(locale, '/'));

    return {
        title: {
            absolute: `${SITE_NAME} - ${t('pageTitle')}`,
        },
        description: t('description'),
        alternates: {
            canonical: homeUrl,
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, '/'))])
            ),
        },
        openGraph: {
            title: `${SITE_NAME} - ${t('pageTitle')}`,
            description: t('ogDescription'),
            type: "website",
            locale: ogLocale,
            url: homeUrl,
            images: DEFAULT_OG_IMAGES,
        },
    };
}

const featureKeys = [
    {icon: BadgeCheck, key: 'highQuality'},
    {icon: Tag, key: 'bestPrices'},
    {icon: Zap, key: 'fastDelivery'},
] as const;

export default async function Home() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const tHero = await getTranslations({locale, namespace: 'Hero'});
    const banners = await getActiveBanners();

    return (
        <div className="min-h-screen">
            <PromoCarousel
                heroTitle={tHero('title')}
                heroTitleHighlight={tHero('titleHighlight')}
                heroSubtitle={tHero('subtitle')}
                heroCta={tHero('shopNow')}
                heroCtaSecondary={tHero('viewCollections')}
                banners={banners}
            />

            <Suspense>
                <CategoriesShowcase/>
            </Suspense>

            <Suspense>
                <FeaturedProducts/>
            </Suspense>

            <section className="section-spotlight py-16 md:py-28">
                <div className="container mx-auto px-4">
                    <h2 className="text-display text-3xl md:text-5xl font-bold text-white max-w-2xl mb-12 md:mb-16">
                        {t('whyShopWithUs')}
                    </h2>
                    <div className="grid sm:grid-cols-3 gap-10 sm:gap-6">
                        {featureKeys.map((feature) => (
                            <div key={feature.key} className="border-t border-white/15 pt-6 space-y-3">
                                <feature.icon className="size-6 text-primary" strokeWidth={1.75} />
                                <h3 className="text-lg font-semibold text-white">{t(`features.${feature.key}.title`)}</h3>
                                <p className="text-white/60 leading-relaxed">{t(`features.${feature.key}.description`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Suspense>
                <LoyaltyTeaser/>
            </Suspense>

            <Suspense>
                <LatestNewsSection/>
            </Suspense>
        </div>
    );
}
