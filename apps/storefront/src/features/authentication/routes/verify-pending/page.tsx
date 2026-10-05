import type {Metadata} from 'next';
import {Suspense} from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/platform/i18n/navigation';
import { CheckCircle } from 'lucide-react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {SITE_NAME, noIndexRobots} from '@/config/metadata';
import {AuthShell} from '@/features/authentication/components/auth-shell';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Verify.pending'});
    return {
        title: `${t('title')} | ${SITE_NAME}`,
        description: t('message'),
        robots: noIndexRobots(),
    };
}

async function VerifyPendingContent({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Verify'});
    const resolvedParams = await searchParams;
    const redirectTo = resolvedParams?.redirectTo as string | undefined;

    const signInHref = redirectTo
        ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
        : '/login';

    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-success" />
                </div>
                <div className="space-y-2 text-center">
                    <h1 className="text-4xl">{t('pending.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('pending.message')}
                    </p>
                </div>
                <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">
                        {t('pending.spamNote')}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
                <Link href={signInHref} className="w-full">
                    <Button className="w-full">
                        {t('pending.goToSignIn')}
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}

export default async function VerifyPendingPage({searchParams}: PageProps<'/[locale]/verify-pending'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Verify'});
    const tAuth = await getTranslations({locale, namespace: 'Auth'});
    return (
        <AuthShell panelText={tAuth('welcomeBack')}>
            <Suspense fallback={<div>{t('loading')}</div>}>
                <VerifyPendingContent searchParams={searchParams} />
            </Suspense>
        </AuthShell>
    );
}
