import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetArticlesQuery, type ArticleListItem} from '@/features/news/graphql';
import {ArticleCard} from '@/features/news/components/article-card';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {SectionHeader} from '@/components/brand/section-header';
import {Reveal} from '@/components/motion/reveal';

async function getLatestArticles(locale: string) {
    'use cache';
    cacheLife('minutes');
    cacheTag(`news-latest-${locale}`);
    cacheTag('news');

    const result = await query(GetArticlesQuery, {options: {skip: 0, take: 3}}, {languageCode: locale});
    // La copia local del esquema de gql.tada es anterior a los campos bilingües
    // titleEs/titleEn (el mismo problema de CLI documentado en banners-data.ts): se
    // fuerza el tipo en vez de pelearse con la CLI, comprobado contra el esquema real.
    return result.data.articles.items as ArticleListItem[];
}

export async function LatestNewsSection() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'News'});
    const articles = await getLatestArticles(locale);

    if (articles.length === 0) {
        return null;
    }

    return (
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <SectionHeader title={t('homeTitle')} highlight={t('homeHighlight')} action={{href: '/noticias', label: t('viewAll')}} />
                <Reveal className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {articles.map(article => (
                        <ArticleCard key={article.id} article={article} locale={locale} />
                    ))}
                </Reveal>
            </div>
        </section>
    );
}
