'use client';

import {useEffect, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {AlertTriangle, Home, RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {routing} from '@/platform/i18n/routing';
import {useAutoRecovery} from './use-auto-recovery';

/**
 * Página de error de la tienda (error.tsx de [locale]): se pinta dentro del layout,
 * con cabecera y pie, cuando falla una página (una búsqueda, una ficha…). Sustituye
 * a la pantalla genérica de Next con el botón "Reload". Vuelve sola al inicio
 * (ver useAutoRecovery) y ofrece reintentar, ir ya al inicio o quedarse.
 */
export default function ErrorPage({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
    const t = useTranslations('ErrorPage');
    const locale = useLocale();
    const router = useRouter();
    const [isRetrying, startTransition] = useTransition();
    const homeHref = locale === routing.defaultLocale ? '/' : `/${locale}`;
    const {mode, seconds, cancel} = useAutoRecovery({homeHref, seconds: 6});

    useEffect(() => {
        console.error(error);
    }, [error]);

    const retry = () => {
        cancel();
        // refresh vuelve a pedir los datos al servidor; reset vuelve a pintar la página.
        startTransition(() => {
            router.refresh();
            reset();
        });
    };

    return (
        <div className="min-h-[calc(100vh-var(--header-offset))] flex items-center justify-center px-4 py-16">
            <div role="alert" className="text-center space-y-8 max-w-lg">
                <div className="flex justify-center">
                    <div className="rounded-full bg-muted p-6">
                        <AlertTriangle className="h-16 w-16 text-primary" aria-hidden="true" />
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground max-w-sm mx-auto">{t('message')}</p>
                    {mode !== 'none' && (
                        <p className="text-sm font-medium" aria-live="polite">
                            {mode === 'redirect' ? t('redirecting', {seconds}) : t('reloading', {seconds})}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3 justify-center sm:flex-row">
                    <Button size="lg" onClick={retry} disabled={isRetrying}>
                        <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('retry')}
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => window.location.assign(homeHref)}>
                        <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('goHome')}
                    </Button>
                    {mode !== 'none' && (
                        <Button size="lg" variant="ghost" onClick={cancel}>
                            {t('stay')}
                        </Button>
                    )}
                </div>

                {error.digest && (
                    <p className="text-xs text-muted-foreground">{t('reference', {digest: error.digest})}</p>
                )}
            </div>
        </div>
    );
}
