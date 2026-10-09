import type {Metadata} from 'next';
import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetArticlesQuery, type ArticleListItem} from '@/features/news/graphql';
import Image from 'next/image';
import {ArrowRight} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';
import {formatDate} from '@/platform/i18n/format';
import {ArticleCard} from '@/features/news/components/article-card';
import {ListingHeader} from '@/features/products/listing-header';
import {Pagination} from '@/components/pagination';
import {DEFAULT_OG_IMAGES, SITE_NAME, buildCanonicalUrl, localizedPath} from '@/config/metadata';
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
            images: DEFAULT_OG_IMAGES,
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
    // La copia local del esquema de gql.tada es anterior a los campos bilingües
    // titleEs/titleEn (el mismo problema de CLI que en banners-data.ts): se fuerza el
    // tipo en vez de pelearse con la CLI, comprobado contra el esquema real.
    const articles = data.articles.items as ArticleListItem[];
    const totalPages = Math.ceil(data.articles.totalItems / ITEMS_PER_PAGE);

    // La primera noticia de la primera página va destacada en un bloque oscuro.
    const featured = currentPage === 1 ? articles[0] : undefined;
    const rest = featured ? articles.slice(1) : articles;
    const featuredTitle = featured && (locale === 'es' ? featured.titleEs : featured.titleEn);
    const featuredExcerpt = featured && (locale === 'es' ? featured.excerptEs : featured.excerptEn);

    return (
        <>
            <ListingHeader crumbs={[{label: t('home'), href: '/'}, {label: t('pageTitle')}]} title={t('pageTitle')} watermark="N" />
            <div className="container mx-auto px-4 py-10">
                {articles.length === 0 ? (
                    <p className="text-muted-foreground">{t('noArticles')}</p>
                ) : (
                    <>
                        {featured && (
                            <Link href={`/noticias/${featured.slug}`} className={`group hover-lift img-zoom mb-10 grid overflow-hidden rounded-xl bg-brand text-brand-fg ${featured.coverImage ? 'md:grid-cols-2' : ''}`}>
                                {featured.coverImage && (
                                    <div className="relative aspect-video overflow-hidden md:aspect-auto md:min-h-80">
                                        <Image src={featured.coverImage.preview} alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
                                    </div>
                                )}
                                <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
                                    {featured.publishedAt && (
                                        <p className="text-xs uppercase tracking-[.16em] text-brand-muted">{formatDate(featured.publishedAt, 'long', locale)}</p>
                                    )}
                                    <h2 className="text-4xl md:text-5xl">{featuredTitle}</h2>
                                    <p className="line-clamp-3 text-brand-muted">{featuredExcerpt}</p>
                                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-text">
                                        {t('readArticle')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                    </span>
                                </div>
                            </Link>
                        )}
                        {rest.length > 0 && (
                            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {rest.map(article => (
                                    <ArticleCard key={article.id} article={article} locale={locale} headingLevel="h2" />
                                ))}
                            </div>
                        )}
                        {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
                    </>
                )}
            </div>
        </>
    );
}
