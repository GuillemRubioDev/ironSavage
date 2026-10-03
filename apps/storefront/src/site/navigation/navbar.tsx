import {Logo} from '@/components/brand/logo';
import {NavigationLink} from '@/site/navigation/navigation-link';
import {Link} from '@/platform/i18n/navigation';
import {NavbarCollections} from '@/site/navigation/navbar/navbar-collections';
import {NavbarCart} from '@/site/navigation/navbar/navbar-cart';
import {NavbarUser} from '@/site/navigation/navbar/navbar-user';
import {ThemeSwitcher} from '@/site/navigation/navbar/theme-switcher';
import {LanguagePicker} from '@/site/navigation/navbar/language-picker';
import {CurrencyPickerWrapper} from '@/site/navigation/navbar/currency-picker-wrapper';
import {MobileNavWrapper} from '@/site/navigation/navbar/mobile-nav-wrapper';
import {Suspense} from "react";
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {Search} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {SearchInput} from '@/site/navigation/search-input';
import {NavbarUserSkeleton} from '@/site/navigation/skeletons/navbar-user-skeleton';
import {SearchInputSkeleton} from '@/site/navigation/skeletons/search-input-skeleton';

export async function Navbar() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Navigation'});

    return (
        <header className="fixed print:hidden top-[var(--top-bar-h)] left-0 right-0 z-40 border-b backdrop-blur-md bg-background/80">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-[var(--header-h)] gap-4">
                    <div className="flex items-center gap-4 shrink-0">
                        <Suspense>
                            <MobileNavWrapper currencyPicker={<CurrencyPickerWrapper />} />
                        </Suspense>
                        <NavigationLink href="/" className="shrink-0">
                            <Logo variant="wordmark" priority className="h-6 md:h-7" />
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
                        {/* Buscador completo solo donde de verdad cabe su ancho fijo junto a la
                            navegación de colecciones (2xl+, 1536px). En escritorios más
                            estrechos (un rango muy habitual, incluido 1440px) acababa
                            montándose sobre la navegación, porque ninguno de los dos lados
                            puede encogerse (etiquetas sin salto de línea, campo de ancho
                            fijo). Por debajo de 2xl, un icono que enlaza a la página /search
                            cubre lo mismo sin ocupar 256px; en móvil ya hay un buscador
                            completo en el menú lateral. */}
                        <div className="hidden 2xl:flex">
                            <Suspense fallback={<SearchInputSkeleton />}>
                                <SearchInput/>
                            </Suspense>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden lg:flex 2xl:hidden"
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
