import type {CSSProperties} from 'react';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTopCollectionsWithImages} from '@/features/collections/data';
import {CollectionTile} from '@/components/brand/collection-tile';

/**
 * Fila de categorías superpuesta al borde inferior del banner de portada (el banner
 * deja el hueco con su relleno inferior). El titular queda solo para lectores de
 * pantalla: visualmente la fila va pegada al banner.
 */
export async function CategoriesShowcase() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home.categories'});
    const collections = await getTopCollectionsWithImages(locale);

    if (!collections.length) return null;

    return (
        <section aria-labelledby="home-categories" className="relative z-10 -mt-20 md:-mt-24">
            <div className="container mx-auto px-4">
                <h2 id="home-categories" className="sr-only">{t('title')}</h2>
                {/* Móvil: fila con desplazamiento horizontal; escritorio: una fila de 6. */}
                <ul className="stagger -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-none md:mx-0 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible md:px-0">
                    {collections.slice(0, 6).map((collection, i) => (
                        <li key={collection.id} style={{'--i': i} as CSSProperties} className="w-[40vw] shrink-0 snap-start sm:w-[28vw] md:w-auto">
                            <CollectionTile href={`/categorias/${collection.slug}`} name={collection.name} imageUrl={collection.imageUrl} />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
