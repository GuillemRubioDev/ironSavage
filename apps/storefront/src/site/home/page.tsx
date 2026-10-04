import type {Metadata} from "next";
import {Suspense} from "react";
import {getRouteLocale} from "@/platform/i18n/server";
import {HeroBanner} from "@/site/home/hero-banner";
import {getActiveBanners} from "@/site/home/banners-data";
import {CategoriesShowcase} from '@/site/home/categories-showcase';
import {GoalsSection} from '@/site/home/goals-section';
import {FeaturedProducts} from '@/features/products/featured-products';
import {LoyaltyTeaser} from '@/features/loyalty/loyalty-teaser';
import {LatestNewsSection} from '@/features/news/latest-news-section';
import {DEFAULT_OG_IMAGES, SITE_NAME, buildCanonicalUrl, localizedPath} from "@/config/metadata";
import {RotateCcw, ShieldCheck, Star, Truck} from "lucide-react";
import {TrustStrip} from '@/components/brand/trust-strip';
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

export default async function Home() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home'});
    const tHero = await getTranslations({locale, namespace: 'Hero'});
    const banners = await getActiveBanners();

    return (
        <div className="min-h-screen">
            <HeroBanner
                banner={banners[0] ?? null}
                locale={locale}
                fallback={{
                    title: tHero('title'),
                    highlight: tHero('titleHighlight'),
                    subtitle: tHero('subtitle'),
                    cta: tHero('shopNow'),
                }}
            />

            <Suspense>
                <CategoriesShowcase/>
            </Suspense>

            <div className="container mx-auto mt-10 px-4">
                <TrustStrip items={[
                    {icon: Truck, title: t('trust.shipping.title'), text: t('trust.shipping.text')},
                    {icon: ShieldCheck, title: t('trust.payment.title'), text: t('trust.payment.text')},
                    {icon: RotateCcw, title: t('trust.returns.title'), text: t('trust.returns.text')},
                    {icon: Star, title: t('trust.points.title'), text: t('trust.points.text')},
                ]} />
            </div>

            <Suspense>
                <FeaturedProducts/>
            </Suspense>

            <Suspense>
                <GoalsSection/>
            </Suspense>

            <Suspense>
                <LoyaltyTeaser/>
            </Suspense>

            <Suspense>
                <LatestNewsSection/>
            </Suspense>
        </div>
    );
}
