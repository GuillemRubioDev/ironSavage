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
import {Link} from '@/platform/i18n/navigation';
import {Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {NavbarUserSkeleton} from '@/site/navigation/skeletons/navbar-user-skeleton';
import {SearchInputSkeleton} from '@/site/navigation/skeletons/search-input-skeleton';
import {NavbarCartSkeleton} from '@/site/navigation/skeletons/navbar-cart-skeleton';

export async function Navbar() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Navigation'});

    // Zona de marca: siempre oscura y opaca en los dos temas. Los botones fantasma de
    // dentro (idioma, tema, cuenta, menú) se adaptan al fondo oscuro con la regla del header.
    // Móvil (hasta lg): menú a la izquierda, logo centrado, cuenta y carrito a la derecha.
    return (
        <header className="vt-site-header fixed print:hidden top-[var(--top-bar-h)] left-0 right-0 z-40 border-b border-brand-line bg-brand text-brand-fg [&_[data-slot=button]]:text-brand-fg/85 [&_[data-slot=button]:hover]:bg-white/10 [&_[data-slot=button]:hover]:text-brand-fg [&_[data-slot=button][aria-expanded=true]]:bg-white/10 [&_[data-slot=button][aria-expanded=true]]:text-brand-fg [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-white">
            <div className="container mx-auto px-4">
                <div className="relative flex items-center h-[var(--header-h)] gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <Suspense>
                            <MobileNavWrapper
                                currencyPicker={<CurrencyPickerWrapper />}
                                accountLinks={<Suspense><MobileAccountLinks /></Suspense>}
                            />
                        </Suspense>
                        <NavigationLink href="/" className="absolute left-1/2 shrink-0 -translate-x-1/2 lg:static lg:translate-x-0">
                            <Logo variant="wordmark" priority className="h-7 min-[380px]:h-8" />
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
                    <nav aria-label={t('mainNavigation')} className="hidden lg:flex flex-1 min-w-0 items-center gap-3 overflow-x-auto scrollbar-none pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]">
                        <Suspense>
                            <NavbarCollections/>
                        </Suspense>
                    </nav>
                    <div className="ml-auto flex items-center gap-1 shrink-0 sm:gap-3 lg:ml-0">
                        {/* Buscador completo desde xl (1280 px); entre lg y xl, un icono a /search para
                            dejar sitio a las categorías (que además tienen min-w-0 y scroll propio).
                            En móvil el buscador está en el menú lateral. */}
                        <div className="hidden xl:flex">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <SearchInput inputClassName="border-white/10 bg-brand-surface text-brand-fg placeholder:text-brand-muted"/>
                            </Suspense>
                        </div>
                        {/* Entre lg y xl el campo no cabe junto a las categorías: icono a /search. */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden lg:flex xl:hidden"
                            render={<Link href="/search" aria-label={t('search')} />}
                            nativeButton={false}
                        >
                            <Search className="size-5" aria-hidden="true" />
                        </Button>
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
                        {/* Móvil: el carrito en el extremo derecho (cuenta a su izquierda); en
                            escritorio, carrito y después la cuenta. */}
                        <div className="order-last flex lg:order-none">
                            <Suspense fallback={<NavbarCartSkeleton />}>
                                <NavbarCart/>
                            </Suspense>
                        </div>
                        <Suspense fallback={<NavbarUserSkeleton />}>
                            <NavbarUser/>
                        </Suspense>
                    </div>
                </div>
            </div>
        </header>
    );
}
