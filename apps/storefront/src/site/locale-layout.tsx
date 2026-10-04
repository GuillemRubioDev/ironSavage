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
import {DisablePinchZoom} from "@/site/app-shell/disable-pinch-zoom";
import {EnvironmentBadge} from "@/site/app-shell/environment-badge";
import {DEFAULT_OG_IMAGES, SITE_NAME, SITE_URL} from "@/config/metadata";

// Inter: texto de interfaz y cuerpo muy legible. Oswald: fuente condensada y de trazo
// grueso para títulos, la «voz deportiva» de la marca; nunca para el texto normal (ver
// las reglas `.text-display`/`h1..h6` en globals.css).
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

// Fuente gruesa de estarcido militar, con remates angulosos parecidos a las letras del
// logo real de IRON SAVAGE. Solo para el «ENTRENA» de la portada
// (site/home/promo-carousel.tsx), nunca como fuente de títulos general: Oswald sigue
// siendo la «voz deportiva» de los títulos normales.
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

// Sin zoom con dos dedos: la tienda debe comportarse como una app en el móvil
// (decisión de producto; ver DisablePinchZoom para Safari de iOS, que ignora
// userScalable). Ojo: impide ampliar con los dedos (WCAG 1.4.4); el tamaño de texto
// del sistema o del navegador sigue funcionando.
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
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
                <EnvironmentBadge />
                <DisablePinchZoom />
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
