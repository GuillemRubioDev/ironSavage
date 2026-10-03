'use client';

import {ReactNode, useState} from 'react';
import { Link, useRouter } from '@/platform/i18n/navigation';
import {Menu, Search, ShoppingBag, User, Package, MapPin, FileText, Star, Newspaper} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    Sheet,
    SheetTrigger,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetClose,
} from '@/components/ui/sheet';
import {useTranslations} from 'next-intl';
import {LanguagePicker} from '@/site/navigation/navbar/language-picker';
import {ThemeSwitcher} from '@/site/navigation/navbar/theme-switcher';

interface Collection {
    id: string;
    name: string;
    slug: string;
}

interface MobileNavProps {
    collections: Collection[];
    /** Se renderiza en el servidor (necesita las monedas de la tienda): se pasa como prop
     * en vez de importarse, porque este es un componente de cliente. */
    currencyPicker?: ReactNode;
}

export function MobileNav({collections, currencyPicker}: MobileNavProps) {
    const t = useTranslations('Navigation');
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;
        router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`);
        setOpen(false);
    };

    const handleLinkClick = () => {
        setOpen(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
                <Menu className="size-5" />
                <span className="sr-only">{t('openMenu')}</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-sm overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{t('menu')}</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6 px-4 pb-6">
                    {/* Búsqueda */}
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('searchProducts')}
                            className="pl-9 w-full"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </form>

                    {/* Ver toda la tienda */}
                    <div>
                        <SheetClose
                            render={
                                <Link
                                    href="/productos"
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                />
                            }
                            nativeButton={false}
                            onClick={handleLinkClick}
                        >
                            <ShoppingBag className="h-5 w-5" />
                            {t('shopAll')}
                        </SheetClose>
                    </div>

                    {/* Noticias */}
                    <div>
                        <SheetClose
                            render={
                                <Link
                                    href="/noticias"
                                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                />
                            }
                            nativeButton={false}
                            onClick={handleLinkClick}
                        >
                            <Newspaper className="h-5 w-5" />
                            {t('news')}
                        </SheetClose>
                    </div>

                    {/* Colecciones */}
                    {collections.length > 0 && (
                        <div>
                            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {t('collections')}
                            </p>
                            <nav aria-label={t('collections')} className="flex flex-col gap-0.5">
                                {collections.map((collection) => (
                                    <SheetClose
                                        key={collection.slug}
                                        render={
                                            <Link
                                                href={`/categorias/${collection.slug}`}
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                            />
                                        }
                                        nativeButton={false}
                                        onClick={handleLinkClick}
                                    >
                                        {collection.name}
                                    </SheetClose>
                                ))}
                            </nav>
                        </div>
                    )}

                    {/* Enlaces de la cuenta */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('account')}
                        </p>
                        <nav aria-label={t('account')} className="flex flex-col gap-0.5">
                            <SheetClose
                                render={
                                    <Link
                                        href="/mi-cuenta/profile"
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <User className="h-5 w-5" />
                                {t('profile')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/mi-cuenta/pedidos"
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <Package className="h-5 w-5" />
                                {t('orders')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/mi-cuenta/facturas"
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <FileText className="h-5 w-5" />
                                {t('invoices')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/mi-cuenta/puntos"
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <Star className="h-5 w-5" />
                                {t('points')}
                            </SheetClose>
                            <SheetClose
                                render={
                                    <Link
                                        href="/mi-cuenta/addresses"
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                                    />
                                }
                                nativeButton={false}
                                onClick={handleLinkClick}
                            >
                                <MapPin className="h-5 w-5" />
                                {t('addresses')}
                            </SheetClose>
                        </nav>
                    </div>

                    {/* Preferencias: en móvil, idioma/moneda/tema solo están aquí; la
                        cabecera principal los oculta por debajo de md para dejar sitio a
                        las colecciones (ver navbar.tsx). */}
                    <div>
                        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('preferences')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 px-3">
                            <LanguagePicker />
                            {currencyPicker}
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
