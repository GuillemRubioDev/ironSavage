'use client';

import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Link} from '@/platform/i18n/navigation';
import {cn} from '@/lib/utils';

/**
 * Pestañas Iniciar sesión / Crear cuenta de las páginas de acceso. Conservan redirectTo
 * (p. ej. al llegar desde el checkout) para volver allí tras entrar o registrarse. Es de
 * cliente porque leer los parámetros de la URL en el servidor haría dinámica la página.
 */
export function AuthTabs({tab}: {tab: 'signIn' | 'register'}) {
    const t = useTranslations('Auth');
    const redirectTo = useSearchParams().get('redirectTo');
    const query = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
    const tabClass = (active: boolean) => cn(
        'flex-1 border-b-2 px-4 py-3 text-center text-sm font-semibold uppercase tracking-wide transition-colors',
        active ? 'border-primary-solid text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
    );

    return (
        <nav aria-label={t('authTabs')} className="flex border-b border-border">
            <Link href={`/login${query}`} aria-current={tab === 'signIn' ? 'page' : undefined} className={tabClass(tab === 'signIn')}>{t('signIn')}</Link>
            <Link href={`/registro${query}`} aria-current={tab === 'register' ? 'page' : undefined} className={tabClass(tab === 'register')}>{t('createAccount')}</Link>
        </nav>
    );
}
