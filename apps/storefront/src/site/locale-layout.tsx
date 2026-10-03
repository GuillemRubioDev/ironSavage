import type {Metadata, Viewport} from "next";
import {locale as rootLocale} from "next/root-params";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {Black_Ops_One, Geist_Mono, Inter, Oswald} from "next/font/google";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import {routing} from "@/platform/i18n/routing";
import {toOgLocale} from "@/platform/i18n/locale-utils";
import {getRouteLocale} from "@/platform/i18n/server";
import {Toaster} from "@/components/ui/sonner";
import {TopBar} from '@/site/navigation/top-bar';
import {Navbar} from '@/site/navigation/navbar';
import {Footer} from "@/site/footer";
import {ThemeProvider} from "@/site/providers/theme-provider";
import {CookieConsentRoot} from "@/site/cookie-consent/cookie-consent-root";
import {DEFAULT_OG_IMAGES, SITE_NAME, SITE_URL} from "@/config/metadata";

// Inter: highly legible UI/body text. Oswald: condensed, strong-weight
// display font for headings — the "athletic" brand voice, never used for
// body copy (see the `.text-display`/`h1..h6` rules in globals.css).
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const oswald = Oswald({
    variable: "--font-oswald",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

// Bold military-stencil face — angular cut terminals close to the real
// IRON SAVAGE logo's own letterforms. Only for the homepage hero's
// "ENTRENA" (site/home/promo-carousel.tsx), never the site-wide display
// font: oswald above stays the "athletic" voice for regular headings.
const blackOpsOne = Black_Ops_One({
    variable: "--font-brand-display",
    subsets: ["latin"],
    weight: "400",
});

export function generateStaticParams() {
    return routing.locales.map((locale) => ({locale}));
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const ogLocale = toOgLocale(locale);
    const t = await getTranslations({locale, namespace: 'Common'});

    return {
        metadataBase: new URL(SITE_URL),
        title: {
            default: SITE_NAME,
            template: `%s | ${SITE_NAME}`,
        },
        description: t('siteDescription', {siteName: SITE_NAME}),
        openGraph: {
            type: "website",
            siteName: SITE_NAME,
            locale: ogLocale,
            images: DEFAULT_OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                "max-video-preview": -1,
                "max-image-preview": "large",
                "max-snippet": -1,
            },
        },
        alternates: {
            languages: Object.fromEntries(
                routing.locales.map((l) => [l, `/${l}`])
            ),
        },
    };
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "#ffffff"},
        {media: "(prefers-color-scheme: dark)", color: "#000000"},
    ],
};

export default async function LocaleLayout({children}: {children: React.ReactNode}) {
    const locale = await rootLocale();

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages({locale});
    const tNav = await getTranslations({locale, namespace: 'Navigation'});

    return (
        <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
            <body
                className={`${inter.variable} ${oswald.variable} ${geistMono.variable} ${blackOpsOne.variable} antialiased flex flex-col min-h-screen`}
            >
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider>
                        <CookieConsentRoot>
                            {/* WCAG 2.4.1: first focusable element, visible only when
                                focused — keyboard users skip the header/menus. */}
                            <a
                                href="#main-content"
                                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-primary"
                            >
                                {tNav('skipToContent')}
                            </a>
                            <TopBar />
                            <Navbar />
                            {/* Single centralized offset for the fixed TopBar+Navbar
                                stack — every page's content starts here, below the
                                header, with no per-page compensation needed. See
                                --header-offset in globals.css. */}
                            <main id="main-content" tabIndex={-1} className="flex-1 pt-[var(--header-offset)] print:pt-0 focus:outline-none">
                                {children}
                            </main>
                            <Footer/>
                            <Toaster/>
                        </CookieConsentRoot>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
