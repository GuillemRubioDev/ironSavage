import {Logo} from '@/components/brand/logo';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {NavbarCollections} from '@/site/navigation/navbar/navbar-collections';
import {NavbarCart} from '@/site/navigation/navbar/navbar-cart';
import {NavbarUser} from '@/site/navigation/navbar/navbar-user';
import {ThemeSwitcher} from '@/site/navigation/navbar/theme-switcher';
import {LanguagePicker} from '@/site/navigation/navbar/language-picker';
import {CurrencyPickerWrapper} from '@/site/navigation/navbar/currency-picker-wrapper';
import {MobileNavWrapper} from '@/site/navigation/navbar/mobile-nav-wrapper';
import {MobileAccountLinks} from '@/site/navigation/navbar/mobile-account-links';
import {Suspense} from "react";
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {SearchInput} from '@/site/navigation/search-input';
import {NavbarUserSkeleton} from '@/site/navigation/skeletons/navbar-user-skeleton';
import {SearchInputSkeleton} from '@/site/navigation/skeletons/search-input-skeleton';

export async function Navbar() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Navigation'});

    // Zona de marca: siempre oscura y opaca en los dos temas. Los botones fantasma de
    // dentro (idioma, tema, cuenta, menú) se adaptan al fondo oscuro con la regla del header.
    return (
        <header className="fixed print:hidden top-[var(--top-bar-h)] left-0 right-0 z-40 border-b border-brand-line bg-brand text-brand-fg [&_[data-slot=button]]:text-brand-fg/85 [&_[data-slot=button]:hover]:bg-white/10 [&_[data-slot=button]:hover]:text-brand-fg">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-[var(--header-h)] gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <Suspense>
                            <MobileNavWrapper
                                currencyPicker={<CurrencyPickerWrapper />}
                                accountLinks={<Suspense><MobileAccountLinks /></Suspense>}
                            />
                        </Suspense>
                        <NavigationLink href="/" className="shrink-0">
                            <Logo variant="wordmark" priority className="h-7 md:h-8" />
                        </NavigationLink>
                    </div>
                    {/* min-w-0 permite que esto se encoja por debajo del ancho natural de su
                        contenido en vez de salirse de su caja (que es lo que antes se
                        montaba sobre los iconos de la derecha): si la lista de colecciones
                        no cabe en el espacio que dejan el logo y los iconos, se desplaza
                        en horizontal dentro de sus límites en vez de invadir al vecino.
                        lg (1024px), no md (768px): a 768 no hay sitio para toda la lista
                        ni siquiera encogiéndola, y se cortaba a mitad de palabra sin
                        indicación de scroll, así que en tablet se mantiene el menú
                        hamburguesa (ya completo). */}
                    <nav aria-label={t('mainNavigation')} className="hidden lg:flex flex-1 min-w-0 items-center gap-3 overflow-x-auto scrollbar-none">
                        <Suspense>
                            <NavbarCollections/>
                        </Suspense>
                    </nav>
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Buscador visible desde lg (1024 px): el campo encoge a w-56 hasta xl y la
                            navegación de colecciones tiene min-w-0 + scroll propio, así ninguno
                            invade al otro. En móvil el buscador está en el menú lateral. */}
                        <div className="hidden lg:flex">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <SearchInput inputClassName="border-white/10 bg-brand-surface text-brand-fg placeholder:text-brand-muted"/>
                            </Suspense>
                        </div>
                        <div className="hidden lg:flex items-center gap-3">
                            <Suspense>
                                <LanguagePicker />
                            </Suspense>
                            <Suspense>
                                <CurrencyPickerWrapper />
                            </Suspense>
                            <Suspense>
                                <ThemeSwitcher />
                            </Suspense>
                        </div>
                        <Suspense>
                            <NavbarCart/>
                        </Suspense>
                        <Suspense fallback={<NavbarUserSkeleton />}>
                            <NavbarUser/>
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
