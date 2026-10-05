import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import { ForgotPasswordForm } from './forgot-password-form';
import {AuthShell} from '@/features/authentication/components/auth-shell';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return {
        title: t('forgotPasswordPageTitle'),
    };
}

export default async function ForgotPasswordPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Auth'});
    return (
        <AuthShell panelText={t('welcomeBack')}>
            <ForgotPasswordForm />
        </AuthShell>
    );
}
