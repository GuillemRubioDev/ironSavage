import { getRouteLocale } from '@/platform/i18n/server';
import { Button } from '@/components/ui/button';
import { Home, ShoppingBag } from 'lucide-react';
import { Link } from '@/platform/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import {getTopCollections} from '@/features/collections/data';

/**
 * 404 de la tienda: bloque oscuro de marca con el "404" enorme (entra con un leve temblor,
 * quieto con "reducir movimiento"), "Te has salido de la ruta", vuelta al inicio o a la
 * tienda y las categorías principales.
 */
export default async function NotFound() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'NotFound'});
    let collections: { id: string; name: string; slug: string }[] = [];
    try {
        collections = await getTopCollections(locale);
    } catch {
        // Si no se pueden cargar las colecciones, se sigue sin ellas
    }

    return (
        <section className="relative flex min-h-[calc(100vh-var(--header-offset))] items-center overflow-hidden bg-brand px-4 py-16 text-brand-fg">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgb(231_0_11/22%),transparent)]" aria-hidden="true" />
            <div className="container relative mx-auto max-w-2xl space-y-8 text-center">
                <p aria-hidden="true" className="animate-glitch-in font-display text-[clamp(8rem,28vw,18rem)] font-black italic leading-none text-primary-text">
                    404
                </p>

                <div className="space-y-3">
                    <h1 className="text-5xl md:text-6xl">{t('title')}</h1>
                    <p className="mx-auto max-w-md text-brand-muted">{t('message')}</p>
                </div>

                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Button nativeButton={false} render={<Link href="/" />} size="xl">
                        <Home aria-hidden="true" />
                        {t('goHome')}
                    </Button>
                    <Button nativeButton={false} render={<Link href="/productos" />} variant="brand" size="xl">
                        <ShoppingBag aria-hidden="true" />
                        {t('browseProducts')}
                    </Button>
                </div>

                {collections.length > 0 && (
                    <div className="border-t border-brand-line pt-6">
                        <p className="mb-3 text-sm font-medium text-brand-muted">{t('popularCollections')}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {collections.slice(0, 6).map((collection) => (
                                <Link
                                    key={collection.id}
                                    href={`/categorias/${collection.slug}`}
                                    className="rounded-full border border-brand-line px-4 py-1.5 text-sm transition-colors hover:bg-white/10"
                                >
                                    {collection.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
