import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Logo} from '@/components/brand/logo';
import {CookieSettingsLink} from '@/site/cookie-consent/cookie-settings-link';
import {getTranslations} from 'next-intl/server';


const COPYRIGHT_YEAR = 2026;

/** La "version" del package.json raíz, inyectada al compilar por next.config.ts. */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

async function Copyright() {
    'use cache'
    cacheLife('days');

    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Footer'});

    return (
        <div>
            &copy; {COPYRIGHT_YEAR} {t('copyright')}
        </div>
    )
}

export async function Footer() {
    'use cache'
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`footer-${locale}`);
    cacheTag('collections');

    const t = await getTranslations({locale, namespace: 'Footer'});
    const collections = await getTopCollections(locale);

    const linkClass = 'hover:text-brand-fg transition-colors';
    const headingClass = 'text-display text-lg text-brand-fg mb-4';
    const legalLinks: Array<[string, string]> = [
        ['/aviso-legal', t('legalNotice')],
        ['/politica-de-privacidad', t('privacyPolicy')],
        ['/politica-de-cookies', t('cookiePolicy')],
        ['/terminos-y-condiciones', t('termsAndConditions')],
        ['/uso-de-inteligencia-artificial', t('aiTransparency')],
        ['/accesibilidad', t('accessibility')],
    ];

    return (
        <footer className="mt-auto print:hidden border-t border-brand-line bg-brand text-brand-muted">
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-8">
                    <div>
                        <NavigationLink href="/" className="mb-4 inline-block">
                            <Logo variant="full" className="h-24" />
                        </NavigationLink>
                        <p className="text-sm text-balance leading-relaxed">{t('description')}</p>
                        <ul aria-label={t('paymentMethods')} className="mt-5 flex flex-wrap gap-2">
                            {['Visa', 'Mastercard', 'Redsys'].map(method => (
                                <li key={method} className="rounded border border-white/10 bg-brand-surface px-2 py-1 text-[10px] font-bold uppercase text-brand-fg">
                                    {method}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('shop')}</p>
                        <ul className="space-y-2 text-sm">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <NavigationLink href={`/categorias/${collection.slug}`} className={linkClass}>
                                        {collection.name}
                                    </NavigationLink>
                                </li>
                            ))}
                            <li><NavigationLink href="/productos" className={linkClass}>{t('shopAll')}</NavigationLink></li>
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('help')}</p>
                        <ul className="space-y-2 text-sm">
                            <li><NavigationLink href="/mi-cuenta/pedidos" className={linkClass}>{t('orders')}</NavigationLink></li>
                            <li><NavigationLink href="/mi-cuenta/puntos" className={linkClass}>{t('points')}</NavigationLink></li>
                            <li><NavigationLink href="/mi-cuenta/profile" className={linkClass}>{t('account')}</NavigationLink></li>
                            <li><NavigationLink href="/envios-y-devoluciones" className={linkClass}>{t('shippingReturns')}</NavigationLink></li>
                        </ul>
                    </div>

                    <div>
                        <p className={headingClass}>{t('legal')}</p>
                        <ul className="space-y-2 text-sm">
                            {legalLinks.map(([href, label]) => (
                                <li key={href}><NavigationLink href={href} className={linkClass}>{label}</NavigationLink></li>
                            ))}
                            <li><CookieSettingsLink className={`${linkClass} text-left`} /></li>
                        </ul>
                    </div>
                </div>

                {/* Sección inferior */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-brand-line pt-8 text-center text-xs md:flex-row md:text-left">
                    <Copyright/>
                    <p>
                        {t('aiNotice')}{' '}
                        <NavigationLink href="/uso-de-inteligencia-artificial" className={`underline underline-offset-2 ${linkClass}`}>
                            {t('aiNoticeLink')}
                        </NavigationLink>
                    </p>
                    <span className="tabular-nums">{t('version', {version: APP_VERSION})}</span>
                </div>
            </div>
        </footer>
    );
}
