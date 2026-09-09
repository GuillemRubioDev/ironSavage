import type {Metadata} from 'next';
import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetArticlesQuery, type ArticleListItem} from '@/features/news/graphql';
import {ArticleCard} from '@/features/news/components/article-card';
import {Pagination} from '@/features/products/components/pagination';
import {SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {routing} from '@/platform/i18n/routing';

const ITEMS_PER_PAGE = 9;

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'News'});
    const url = buildCanonicalUrl(localizedPath(locale, '/noticias'));

    return {
        title: t('pageTitle'),
        description: t('metaDescription', {siteName: SITE_NAME}),
        alternates: {
            canonical: url,
            languages: Object.fromEntries(routing.locales.map(l => [l, buildCanonicalUrl(localizedPath(l, '/noticias'))])),
        },
        openGraph: {
            title: t('pageTitle'),
            description: t('metaDescription', {siteName: SITE_NAME}),
            type: 'website',
            url,
        },
    };
}

async function getArticles(locale: string, skip: number, take: number) {
    'use cache';
    cacheLife('minutes');
    cacheTag(`news-list-${locale}-${skip}-${take}`);
    cacheTag('news');

    return query(GetArticlesQuery, {options: {skip, take}}, {languageCode: locale});
}

export default async function NewsListPage({searchParams}: PageProps<'/[locale]/noticias'>) {
    const resolvedParams = await searchParams;
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'News'});

    const pageParam = resolvedParams.page;
    const currentPage = Math.max(1, parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam || '1', 10) || 1);
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;

    const {data} = await getArticles(locale, skip, ITEMS_PER_PAGE);
    // gql.tada's local schema snapshot predates the bilingual titleEs/titleEn
    // fields (same stale-CLI issue as banners-data.ts) — cast rather than
    // chase the CLI, verified against the live server schema.
    const articles = data.articles.items as ArticleListItem[];
    const totalPages = Math.ceil(data.articles.totalItems / ITEMS_PER_PAGE);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">{t('pageTitle')}</h1>

            {articles.length === 0 ? (
                <p className="text-muted-foreground">{t('noArticles')}</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                        {articles.map(article => (
                            <ArticleCard key={article.id} article={article} locale={locale} />
                        ))}
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
                </>
            )}
        </div>
    );
}
