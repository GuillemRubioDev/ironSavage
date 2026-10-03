import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetArticlesQuery, type ArticleListItem} from '@/features/news/graphql';
import {ArticleCard} from '@/features/news/components/article-card';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {ArrowRight} from 'lucide-react';

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
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('homeTitle')}</h2>
                    <Link
                        href="/noticias"
                        className="group hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4"
                    >
                        {t('viewAll')}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articles.map(article => (
                        <ArticleCard key={article.id} article={article} locale={locale} />
                    ))}
                </div>
                <div className="mt-8 flex justify-center sm:hidden">
                    <Link href="/noticias" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                        {t('viewAll')}
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
