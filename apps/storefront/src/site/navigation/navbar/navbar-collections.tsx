import {getRouteLocale} from '@/platform/i18n/server';
import {cacheLife, cacheTag} from 'next/cache';
import {getGoalCollections, getTopCollections} from '@/features/collections/data';
import {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuTrigger,
    NavigationMenuContent,
    NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import {NavbarLink} from '@/site/navigation/navbar/navbar-link';
import {Link} from '@/platform/i18n/navigation';
import {getTranslations} from 'next-intl/server';

export async function NavbarCollections() {
    "use cache";
    cacheLife('days');

    const locale = await getRouteLocale();
    cacheTag(`navbar-collections-${locale}`);
    cacheTag(`goal-collections-${locale}`);
    cacheTag('collections');

    const [collections, goals, t] = await Promise.all([
        getTopCollections(locale),
        getGoalCollections(locale),
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
                {/* Objetivos (seed): desplegable; sin objetivos en la tienda, no aparece.
                    Las clases claras van aquí porque el selector de navbar.tsx solo
                    alcanza a los [data-slot=button], no a este trigger. */}
                {goals.length > 0 && (
                    <NavigationMenuItem>
                        <NavigationMenuTrigger className="bg-transparent px-2.5 text-xs font-semibold uppercase tracking-wide text-brand-fg/80 hover:bg-white/10 hover:text-brand-fg focus:bg-white/10 focus:text-brand-fg data-popup-open:bg-white/10 data-popup-open:text-brand-fg data-open:bg-white/10 data-open:text-brand-fg">
                            {t('goals')}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                            <ul className="grid w-56 gap-0.5 p-1">
                                {goals.map((goal) => (
                                    <li key={goal.slug}>
                                        <NavigationMenuLink render={<Link href={`/categorias/${goal.slug}`} />} className="w-full font-medium">
                                            {goal.name}
                                        </NavigationMenuLink>
                                    </li>
                                ))}
                            </ul>
                        </NavigationMenuContent>
                    </NavigationMenuItem>
                )}
                <NavigationMenuItem>
                    <NavbarLink href="/noticias">{t('news')}</NavbarLink>
                </NavigationMenuItem>
            </NavigationMenuList>
        </NavigationMenu>
    );
}
