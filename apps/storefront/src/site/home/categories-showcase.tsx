import Image from 'next/image';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTopCollectionsWithImages} from '@/features/collections/data';
import {Link} from '@/platform/i18n/navigation';

export async function CategoriesShowcase() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Home.categories'});
    const collections = await getTopCollectionsWithImages(locale);

    if (!collections.length) return null;

    return (
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <h2 className="text-display text-2xl md:text-4xl font-bold mb-8 md:mb-12">
                    {t('title')}
                </h2>
                {/* Mobile: horizontal snap-scroll row, not a cramped grid — each tile
                    reads as a deliberate card, not a shrunk desktop cell. Desktop: a
                    plain 3-column grid, chosen deliberately (not 4) so any number of
                    collections up to a multiple of 3 fills evenly with no leftover
                    half-empty row (this store has exactly 6 today). */}
                <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
                    {collections.slice(0, 9).map((collection) => (
                        <Link
                            key={collection.id}
                            href={`/categorias/${collection.slug}`}
                            className="group relative aspect-[4/5] shrink-0 w-[68vw] sm:w-[42vw] md:w-auto snap-start overflow-hidden rounded-lg bg-muted"
                        >
                            {collection.imageUrl ? (
                                <Image
                                    src={collection.imageUrl}
                                    alt={collection.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 70vw, 33vw"
                                />
                            ) : (
                                // No collection image and no product with an image either —
                                // an elegant brand fallback instead of a broken/empty box.
                                <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.004_260)] via-secondary to-[oklch(0.577_0.245_27.325_/_35%)]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-5 flex items-center justify-between gap-2">
                                <span className="font-display font-semibold uppercase tracking-tight text-white text-lg leading-tight">
                                    {collection.name}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="shrink-0 text-white/70 transition-all duration-300 group-hover:text-primary group-hover:translate-x-0.5"
                                >
                                    →
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
