import type {Metadata} from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {AuthShell} from '@/features/authentication/components/auth-shell';

export const metadata: Metadata = {
    title: 'Reset Password',
    description: 'Create a new password for your account.',
};

export default async function ResetPasswordPage({searchParams}: PageProps<'/[locale]/reset-password'>) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return (
        <AuthShell panelText={t('welcomeBack')}>
            <Suspense fallback={
                <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }>
                <ResetPasswordForm searchParams={searchParams} />
            </Suspense>
        </AuthShell>
    );
}
