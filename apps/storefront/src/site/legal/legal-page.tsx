import type {Metadata} from 'next';
import {getFormatter, getTranslations} from 'next-intl/server';
import {buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {LEGAL_VERSION} from '@/config/legal';
import {getRouteLocale} from '@/platform/i18n/server';
import {routing} from '@/platform/i18n/routing';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Languages, TriangleAlert} from 'lucide-react';
import {PrintButton} from '@/site/legal/print-button';
import {LegalToc} from '@/site/legal/legal-toc';

/** Ver LEGAL_VERSION (config/legal.ts): actualízala allí cuando cambie un texto legal. */
const LEGAL_LAST_UPDATED = new Date(`${LEGAL_VERSION}T00:00:00Z`);

export type LegalPageKey =
    | 'legalNotice' | 'privacyPolicy' | 'cookiePolicy' | 'termsAndConditions' | 'shippingReturns' | 'aiTransparency' | 'accessibility';

/** Título + canonical/alternativas hreflang, igual en todas las páginas legales. */
export async function legalPageMetadata(path: string, key: LegalPageKey): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal.pages'});
    return {
        // La plantilla de título del layout de idioma añade "| SITE_NAME".
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
        <>
            <header className="bg-brand text-brand-fg print:bg-transparent print:text-black">
                <div className="container mx-auto px-4 py-10 md:py-14">
                    <h1 className="text-5xl md:text-6xl" data-legal-title>{title}</h1>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-brand-muted print:text-black">
                        <span data-legal-updated>
                            {t('lastUpdated', {date: format.dateTime(LEGAL_LAST_UPDATED, {dateStyle: 'long', timeZone: 'UTC'})})}
                        </span>
                        <PrintButton label={t('print')} />
                    </div>
                </div>
            </header>

            <div data-legal-page className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] print:block print:py-0">
                {/* Índice generado de los títulos (solo escritorio y nunca al imprimir). */}
                <aside className="hidden lg:block print:hidden">
                    <div className="sticky top-[calc(var(--header-offset)+1.5rem)]">
                        <LegalToc label={t('contents')} />
                    </div>
                </aside>

                {/* Ancho de línea cómodo (~70 caracteres); completo al imprimir. */}
                <div className="max-w-[70ch] print:max-w-none">
                    {/* Móvil: el índice plegable encima del texto. */}
                    <details className="mb-8 rounded-lg border border-border p-4 lg:hidden print:hidden">
                        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide">{t('contents')}</summary>
                        <div className="mt-4">
                            <LegalToc label={t('contents')} showLabel={false} />
                        </div>
                    </details>
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

                    <div id="legal-content" className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6 [&_h2]:font-display [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-2xl [&_h2]:border-t [&_h2]:border-border [&_h2]:pt-6 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-32 [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:py-2 [&_th]:pr-3 [&_td]:align-top [&_td]:border-b [&_td]:py-2 [&_td]:pr-3 [&_td]:text-muted-foreground [&_section>p+p]:mt-3 print:text-black print:[&_p]:text-black print:[&_li]:text-black print:[&_td]:text-black">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}

/** Las tablas anchas (cookies, actividades de tratamiento) se desplazan por sí solas en el móvil. */
export function LegalTable({children}: {children: React.ReactNode}) {
    return (
        <div className="overflow-x-auto">
            <table>{children}</table>
        </div>
    );
}

/** Marcador en línea de un valor que hay que rellenar con datos reales de la empresa
 * antes de usar esta página en producción: nunca inventes el valor, solo señala
 * dónde va. */
export function Placeholder({children}: {children: React.ReactNode}) {
    return (
        <mark className="rounded bg-warning/25 px-1 py-0.5 font-medium text-foreground print:text-black">
            {children}
        </mark>
    );
}
