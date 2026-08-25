import type {Metadata} from "next";
import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {PromoCarousel} from "@/site/home/promo-carousel";
import {CategoriesShowcase} from '@/site/home/categories-showcase';
import {FeaturedProducts} from '@/features/products/featured-products';
import {LoyaltyTeaser} from '@/features/loyalty/components/loyalty-teaser';
import {LatestNewsSection} from '@/features/news/components/latest-news-section';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from "@/config/metadata";
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

    return (
        <div className="min-h-screen">
            <PromoCarousel
                heroTitle={tHero('title')}
                heroTitleHighlight={tHero('titleHighlight')}
                heroSubtitle={tHero('subtitle')}
                heroCta={tHero('shopNow')}
                heroCtaSecondary={tHero('viewCollections')}
            />

            <Suspense>
                <CategoriesShowcase/>
            </Suspense>

            <Suspense>
                <FeaturedProducts/>
            </Suspense>

            <section className="py-16 md:py-24 bg-muted/30">
                <div className="container mx-auto px-4">
                    <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight text-center mb-12">
                        {t('whyShopWithUs')}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {featureKeys.map((feature) => (
                            <div
                                key={feature.key}
                                className="group relative text-center space-y-4 rounded-xl border border-transparent bg-card p-8 transition-all duration-300 hover:border-border hover:shadow-lg hover:-translate-y-1"
                            >
                                <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center transition-colors duration-300 group-hover:bg-primary/20">
                                    <feature.icon className="size-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">{t(`features.${feature.key}.title`)}</h3>
                                <p className="text-muted-foreground leading-relaxed">{t(`features.${feature.key}.description`)}</p>
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
