import type {Metadata, Viewport} from "next";
import {locale as rootLocale} from "next/root-params";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {Barlow_Condensed, Inter} from "next/font/google";
import {getMessages, getTranslations, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import {ViewTransition} from "react";
import {routing} from "@/platform/i18n/routing";
import {toOgLocale} from "@/platform/i18n/locale-utils";
import {getRouteLocale} from "@/platform/i18n/server";
import {Toaster} from "@/components/ui/sonner";
import {TopBar} from '@/site/navigation/top-bar';
import {Navbar} from '@/site/navigation/navbar';
import {Footer} from "@/site/footer";
import {ThemeProvider} from "@/site/providers/theme-provider";
import {CookieConsentRoot} from "@/site/cookie-consent/cookie-consent-root";
import {EnvironmentBadge} from "@/site/app-shell/environment-badge";
import {AppFreshness} from "@/site/app-shell/app-freshness";
import {DEFAULT_OG_IMAGES, SITE_NAME, SITE_URL} from "@/config/metadata";

// Inter: texto de interfaz, cuerpo y precios (con cifras tabulares).
const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

// Barlow Condensed cursiva: titulares, nombres de producto y cifras grandes de marca.
const barlowCondensed = Barlow_Condensed({
    variable: "--font-barlow-condensed",
    subsets: ["latin"],
    weight: ["700", "800", "900"],
    style: ["italic"],
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

// maximumScale 5 a propósito: el zoom con dos dedos debe seguir funcionando por
// accesibilidad (WCAG 1.4.4, Ley 11/2023). Lo que sí se quita es el zoom por doble
// toque, con `touch-action: manipulation` en globals.css.
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
        // Las variables de fuente van en <html>: los tokens (--font-display, --font-sans…)
        // se definen en :root y solo se resuelven si la variable existe en ese mismo nivel.
        <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${barlowCondensed.variable}`}>
            <body className="antialiased flex flex-col min-h-screen">
                <EnvironmentBadge />
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <ThemeProvider>
                        <CookieConsentRoot>
                            {/* WCAG 2.4.1: primer elemento enfocable, visible solo con el foco;
                                quien usa teclado se salta la cabecera y los menús. */}
                            <a
                                href="#main-content"
                                className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:outline-2 focus:outline-primary"
                            >
                                {tNav('skipToContent')}
                            </a>
                            <TopBar />
                            <Navbar />
                            {/* Único desplazamiento centralizado para la cabecera fija
                                TopBar + Navbar: el contenido de cada página empieza aquí,
                                debajo de la cabecera, sin compensaciones por página. Ver
                                --header-offset en globals.css. */}
                            <main id="main-content" tabIndex={-1} className="flex-1 pt-[var(--header-offset)] print:pt-0 focus:outline-none">
                                {/* Fundido entre páginas en navegadores que lo soportan; ver ::view-transition en globals.css. */}
                                <ViewTransition>{children}</ViewTransition>
                            </main>
                            <Footer/>
                            <Toaster/>
                            <AppFreshness/>
                        </CookieConsentRoot>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
