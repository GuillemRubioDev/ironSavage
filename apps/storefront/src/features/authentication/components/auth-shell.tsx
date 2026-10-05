import {Suspense, type ReactNode} from 'react';
import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {Logo} from '@/components/brand/logo';
import {getRouteLocale} from '@/platform/i18n/server';
import {getAuthPanelImage} from '@/features/authentication/auth-panel-image';
import {AuthTabs} from '@/features/authentication/components/auth-tabs';

/**
 * Envoltorio de las páginas de acceso: panel de marca a la izquierda (imagen elegida en
 * el admin, encuadrada con su punto focal y con un velo oscuro para leer el texto, o el
 * fondo de marca) y, a la derecha, pestañas Iniciar sesión / Crear cuenta (solo en login
 * y registro), título y formulario.
 * Las pestañas (AuthTabs, de cliente) conservan el destino de vuelta de la URL.
 */
export async function AuthShell({tab, title, subtitle, panelText, children}: {
    tab?: 'signIn' | 'register';
    title?: string;
    subtitle?: string;
    panelText?: string;
    children: ReactNode;
}) {
    const locale = await getRouteLocale();
    const [t, image] = await Promise.all([getTranslations({locale, namespace: 'Auth'}), getAuthPanelImage()]);

    return (
        <div className="flex min-h-[calc(100vh-var(--header-offset))]">
            {/* Panel de marca, solo escritorio: siempre oscuro, sea cual sea el tema. */}
            <div className="relative hidden overflow-hidden bg-brand text-brand-fg lg:flex lg:w-1/2 lg:items-end">
                {image ? (
                    <>
                        {/* Solo se ve en escritorio: en móvil el panel está oculto y no se descarga (sizes 1px). */}
                        <Image src={image.url} alt="" fill sizes="(min-width: 1024px) 50vw, 1px" className="object-cover" style={{objectPosition: image.position}} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" aria-hidden="true" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(231_0_11/22%),transparent)]" aria-hidden="true" />
                )}
                <div className="relative w-full max-w-lg space-y-6 p-12">
                    <Logo variant="full" className="h-32 w-auto" />
                    {panelText && <p className="text-xl leading-relaxed text-white/85">{panelText}</p>}
                    <ul className="grid grid-cols-3 gap-6 pt-2">
                        {[['featureFast', 'featureCheckout'], ['featureSecure', 'featurePayments'], ['featureEasy', 'featureReturns']].map(([featureTitle, featureText]) => (
                            <li key={featureTitle}>
                                <p className="font-display text-2xl font-black italic">{t(featureTitle)}</p>
                                <p className="text-sm text-white/70">{t(featureText)}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Formulario */}
            <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2">
                <div className="w-full max-w-md space-y-6">
                    <Logo variant="wordmark" className="mx-auto h-6 lg:hidden" />
                    {tab && (
                        <Suspense fallback={<div className="h-12 border-b border-border" />}>
                            <AuthTabs tab={tab} />
                        </Suspense>
                    )}
                    {(title || subtitle) && (
                        <div className="space-y-2 text-center">
                            {title && <h1 className="text-5xl">{title}</h1>}
                            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}
