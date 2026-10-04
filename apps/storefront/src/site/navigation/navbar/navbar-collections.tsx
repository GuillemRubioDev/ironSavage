import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getTopCollections} from '@/features/collections/data';
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
} from '@/components/ui/navigation-menu';
import {NavbarLink} from '@/site/navigation/navbar/navbar-link';
import {getTranslations} from 'next-intl/server';

export async function NavbarCollections() {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`navbar-collections-${locale}`);
    cacheTag('collections');

    const [collections, t] = await Promise.all([
        getTopCollections(locale),
        getTranslations({locale, namespace: 'Navigation'}),
    ]);

    return (
        <NavigationMenu>
            <NavigationMenuList>
                {collections.map((collection) => (
                    <NavigationMenuItem key={collection.slug}>
                        <NavbarLink href={`/categorias/${collection.slug}`}>
                            {collection.name}
                        </NavbarLink>
                    </NavigationMenuItem>
                ))}
                <NavigationMenuItem>
                    <NavbarLink href="/noticias">{t('news')}</NavbarLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    );
}
