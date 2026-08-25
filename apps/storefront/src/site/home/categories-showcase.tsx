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
                <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight text-center mb-12">
                    {t('title')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {collections.slice(0, 8).map((collection) => (
                        <Link
                            key={collection.id}
                            href={`/categorias/${collection.slug}`}
                            className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-muted border border-border"
                        >
                            {collection.imageUrl ? (
                                <Image
                                    src={collection.imageUrl}
                                    alt={collection.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="(max-width: 768px) 50vw, 25vw"
                                />
                            ) : (
                                // No collection image and no product with an image either —
                                // an elegant brand fallback instead of a broken/empty box.
                                <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.13_0.004_260)] via-secondary to-[oklch(0.577_0.245_27.325_/_35%)]" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <span className="absolute inset-x-0 bottom-0 p-4 font-display font-semibold uppercase tracking-tight text-white">
                                {collection.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
