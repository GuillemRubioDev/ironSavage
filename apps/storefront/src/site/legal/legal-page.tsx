import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {TriangleAlert} from 'lucide-react';

export async function LegalPageShell({title, children}: {title: string; children: React.ReactNode}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Legal'});

    return (
        <div className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-6">{title}</h1>

            <Alert variant="warning" className="mb-10">
                <TriangleAlert />
                <AlertTitle>{t('draftNotice.title')}</AlertTitle>
                <AlertDescription>{t('draftNotice.description')}</AlertDescription>
            </Alert>

            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6 [&_h2]:font-display [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-tight [&_h2]:text-lg [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
                {children}
            </div>
        </div>
    );
}

/** Inline marker for a placeholder value that must be filled in with real
 * company data before this page is used in production — never invent the
 * value, just flag where it goes. */
export function Placeholder({children}: {children: React.ReactNode}) {
    return (
        <mark className="rounded bg-warning/25 px-1 py-0.5 font-medium text-foreground">
            {children}
        </mark>
    );
}
