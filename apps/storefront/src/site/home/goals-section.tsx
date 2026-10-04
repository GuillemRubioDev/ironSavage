import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getGoalCollections} from '@/features/collections/data';
import {CollectionTile} from '@/components/brand/collection-tile';
import {SectionHeader} from '@/components/brand/section-header';
import {Reveal} from '@/components/motion/reveal';

/** "¿Cuál es tu objetivo?": colecciones de la faceta Objetivo (seed). Sin objetivos, no aparece. */
export async function GoalsSection() {
    const locale = await getRouteLocale();
    const [t, goals] = await Promise.all([
        getTranslations({locale, namespace: 'Home.goals'}),
        getGoalCollections(locale),
    ]);
    if (!goals.length) return null;

    return (
        <section className="bg-brand py-16 text-brand-fg md:py-24">
            <div className="container mx-auto px-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-brand-muted">{t('eyebrow')}</p>
                <SectionHeader title={t('title')} highlight={t('highlight')} tone="brand" />
                <Reveal>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
                        {goals.map((goal, i) => (
                            <li key={goal.id}>
                                <CollectionTile href={`/categorias/${goal.slug}`} name={goal.name} imageUrl={goal.imageUrl} variant="goal" index={i} />
                            </li>
                        ))}
                    </ul>
                </Reveal>
            </div>
        </section>
    );
}
