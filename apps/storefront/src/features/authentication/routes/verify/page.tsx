import type {Metadata} from 'next';
import {Suspense} from 'react';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {SITE_NAME, noIndexRobots} from '@/config/metadata';
import {VerifyLoading} from './verify-loading';
import {VerifyContent} from './verify-content';
import {AuthShell} from '@/features/authentication/components/auth-shell';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Verify'});
    return {
        title: `${t('pageTitle')} | ${SITE_NAME}`,
        description: t('pageDescription'),
        robots: noIndexRobots(),
    };
}

export default async function VerifyPage({searchParams}: PageProps<'/[locale]/verify'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return (
        <AuthShell panelText={t('welcomeBack')}>
            <Suspense fallback={<VerifyLoading/>}>
                <VerifyContent searchParams={searchParams}/>
            </Suspense>
        </AuthShell>
    );
}
