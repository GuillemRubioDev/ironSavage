import type {Metadata} from 'next';
import {getFormatter, getTranslations} from 'next-intl/server';
import {buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LEGAL_VERSION} from '@/config/legal';
import {getRouteLocale} from '@/platform/i18n/server';
import {routing} from '@/platform/i18n/routing';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Languages, TriangleAlert} from 'lucide-react';
import {PrintButton} from '@/site/legal/print-button';

/** See LEGAL_VERSION (config/legal.ts) — bump it there when a legal text changes. */
const LEGAL_LAST_UPDATED = new Date(`${LEGAL_VERSION}T00:00:00Z`);

export type LegalPageKey =
    | 'legalNotice' | 'privacyPolicy' | 'cookiePolicy' | 'termsAndConditions' | 'shippingReturns' | 'aiTransparency' | 'accessibility';

/** Title + canonical/hreflang alternates, the same for every legal page. */
export async function legalPageMetadata(path: string, key: LegalPageKey): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    return {
        // The locale layout's title template appends "| SITE_NAME".
        title: t(key),
        alternates: {
            canonical: buildCanonicalUrl(localizedPath(locale, path)),
            languages: Object.fromEntries(routing.locales.map((l) => [l, buildCanonicalUrl(localizedPath(l, path))])),
        },
    };
}

export async function LegalPageShell({title, children}: {title: string; children: React.ReactNode}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal'});
    const format = await getFormatter({locale});

    return (
        <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24 print:max-w-none print:py-0">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">{title}</h1>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                    {t('lastUpdated', {date: format.dateTime(LEGAL_LAST_UPDATED, {dateStyle: 'long', timeZone: 'UTC'})})}
                </span>
                <PrintButton label={t('print')} />
            </div>

            {locale !== routing.defaultLocale && (
                <Alert className="mb-6">
                    <Languages />
                    <AlertDescription>{t('spanishOnly')}</AlertDescription>
                </Alert>
            )}

            <Alert variant="warning" className="mb-10 print:hidden">
                <TriangleAlert />
                <AlertTitle>{t('draftNotice.title')}</AlertTitle>
                <AlertDescription>{t('draftNotice.description')}</AlertDescription>
            </Alert>

            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6 [&_h2]:font-display [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-lg [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-32 [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:py-2 [&_th]:pr-3 [&_td]:align-top [&_td]:border-b [&_td]:py-2 [&_td]:pr-3 [&_td]:text-muted-foreground [&_section>p+p]:mt-3 print:text-black print:[&_p]:text-black print:[&_li]:text-black print:[&_td]:text-black">
                {children}
            </div>
        </div>
    );
}

/** Wide tables (cookies, processing activities) scroll on their own on phones. */
export function LegalTable({children}: {children: React.ReactNode}) {
    return (
        <div className="overflow-x-auto">
            <table>{children}</table>
        </div>
    );
}

/** Inline marker for a placeholder value that must be filled in with real
 * company data before this page is used in production — never invent the
 * value, just flag where it goes. */
export function Placeholder({children}: {children: React.ReactNode}) {
    return (
        <mark className="rounded bg-warning/25 px-1 py-0.5 font-medium text-foreground print:text-black">
            {children}
        </mark>
    );
}
