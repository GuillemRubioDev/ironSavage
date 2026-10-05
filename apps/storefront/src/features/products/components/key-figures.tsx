import {getTranslations} from 'next-intl/server';
import {Reveal} from '@/components/motion/reveal';
import {flavorCount, netQuantityLabel, proteinPerServing} from '@/features/products/product-facts';

/**
 * Franja oscura de cifras clave de la ficha, derivadas de datos reales: proteína por
 * dosis (tabla nutricional), nº de sabores (opciones) y cantidad neta. Solo se
 * muestran las que existen; si no hay ninguna, la franja no aparece.
 */
export async function KeyFigures({locale, nutrition, optionGroups, variants}: {
    locale: string;
    nutrition?: string | null;
    optionGroups: Array<{code: string; name: string; options: Array<{name: string}>}>;
    variants: Array<{customFields?: {netQuantity?: string | null} | null}>;
}) {
    const t = await getTranslations({locale, namespace: 'Product.facts'});
    const protein = proteinPerServing(nutrition);
    const flavors = flavorCount(optionGroups);
    const net = netQuantityLabel(variants, optionGroups);
    const figures = [
        protein && {value: protein, label: t('protein')},
        flavors && {value: String(flavors), label: t('flavors')},
        net && {value: net, label: t('netQuantity')},
    ].filter((figure): figure is {value: string; label: string} => Boolean(figure));

    if (!figures.length) return null;

    return (
        <section aria-label={t('title')} className="mt-12 bg-brand py-12 text-brand-fg md:py-16">
            <Reveal className="container mx-auto px-4">
                <ul className="grid gap-4 sm:grid-cols-3">
                    {figures.map((figure) => (
                        <li key={figure.label} className="rounded-lg border border-brand-line bg-brand-surface p-6 text-center">
                            <span className={`block break-words font-display font-black italic leading-none text-primary-text ${figure.value.includes('·') ? 'text-3xl md:text-4xl' : 'text-5xl md:text-6xl'}`}>{figure.value}</span>
                            <span className="mt-2 block text-sm text-brand-muted">{figure.label}</span>
                        </li>
                    ))}
                </ul>
            </Reveal>
        </section>
    );
}
