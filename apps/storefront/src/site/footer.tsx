import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Logo} from '@/components/brand/logo';
import {CookieSettingsLink} from '@/site/cookie-consent/cookie-settings-link';
import {getTranslations} from 'next-intl/server';


const COPYRIGHT_YEAR = 2026;

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

    const t = await getTranslations({locale, namespace: 'Footer'});
    const collections = await getTopCollections(locale);

    return (
        <footer className="border-t border-border mt-auto bg-card">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <NavigationLink href="/" className="inline-block mb-4">
                            <Logo variant="full" className="h-24" />
                        </NavigationLink>
                        <p className="text-sm text-muted-foreground text-balance leading-relaxed">
                            {t('description')}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-display font-semibold uppercase tracking-tight mb-4">{t('categories')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {collections.map((collection) => (
                                <li key={collection.id}>
                                    <NavigationLink
                                        href={`/categorias/${collection.slug}`}
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {collection.name}
                                    </NavigationLink>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm font-display font-semibold uppercase tracking-tight mb-4">{t('customer')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <NavigationLink
                                    href="/productos"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('shopAll')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink
                                    href="/mi-cuenta/pedidos"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('orders')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink
                                    href="/mi-cuenta/puntos"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('points')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink
                                    href="/mi-cuenta/profile"
                                    className="hover:text-foreground transition-colors"
                                >
                                    {t('account')}
                                </NavigationLink>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <p className="text-sm font-display font-semibold uppercase tracking-tight mb-4">{t('legal')}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <NavigationLink href="/aviso-legal" className="hover:text-foreground transition-colors">
                                    {t('legalNotice')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink href="/politica-de-privacidad" className="hover:text-foreground transition-colors">
                                    {t('privacyPolicy')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink href="/politica-de-cookies" className="hover:text-foreground transition-colors">
                                    {t('cookiePolicy')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink href="/terminos-y-condiciones" className="hover:text-foreground transition-colors">
                                    {t('termsAndConditions')}
                                </NavigationLink>
                            </li>
                            <li>
                                <NavigationLink href="/envios-y-devoluciones" className="hover:text-foreground transition-colors">
                                    {t('shippingReturns')}
                                </NavigationLink>
                            </li>
                            <li>
                                <CookieSettingsLink className="hover:text-foreground transition-colors text-left" />
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div
                    className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <Copyright/>
                </div>
            </div>
        </footer>
    );
}
