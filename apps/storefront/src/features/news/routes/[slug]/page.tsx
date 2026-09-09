import type {Metadata} from 'next';
import {cacheLife, cacheTag} from 'next/cache';
import {notFound} from 'next/navigation';
import Image from 'next/image';
import {query} from '@/platform/vendure/api';
import {GetArticleQuery, type ArticleDetail} from '@/features/news/graphql';
import {Link} from '@/platform/i18n/navigation';
import {formatDate} from '@/platform/i18n/format';
import {buildCanonicalUrl, localizedPath, truncateDescription, buildOgImages} from '@/config/metadata';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {toOgLocale} from '@/platform/i18n/locale-utils';
import {routing} from '@/platform/i18n/routing';
import {ChevronLeft} from 'lucide-react';

async function getArticle(slug: string, locale: string) {
    'use cache';
    cacheLife('minutes');
    cacheTag(`news-article-${slug}-${locale}`);
    cacheTag('news');

    const result = await query(GetArticleQuery, {slug}, {languageCode: locale});
    // gql.tada's local schema snapshot predates the bilingual titleEs/titleEn
    // fields (same stale-CLI issue as banners-data.ts) — cast rather than
    // chase the CLI, verified against the live server schema.
    return result.data.article as ArticleDetail | null;
}

export async function generateMetadata({params}: PageProps<'/[locale]/noticias/[slug]'>): Promise<Metadata> {
    const {slug} = await params;
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'News'});
    const article = await getArticle(slug, locale);

    if (!article) {
        return {title: t('notFound')};
    }

    const title = locale === 'es' ? article.titleEs : article.titleEn;
    const excerpt = locale === 'es' ? article.excerptEs : article.excerptEn;
    const description = truncateDescription(excerpt);
    const ogLocale = toOgLocale(locale);
    const url = buildCanonicalUrl(localizedPath(locale, `/noticias/${article.slug}`));

    return {
        title,
        description,
        alternates: {
            canonical: url,
            languages: Object.fromEntries(
                routing.locales.map(l => [l, buildCanonicalUrl(localizedPath(l, `/noticias/${article.slug}`))]),
            ),
        },
        openGraph: {
            title,
            description,
            type: 'article',
            locale: ogLocale,
            url,
            images: buildOgImages(article.coverImage?.preview, title),
            ...(article.publishedAt ? {publishedTime: article.publishedAt} : {}),
        },
    };
}

export default async function ArticleDetailPage({params}: PageProps<'/[locale]/noticias/[slug]'>) {
    const {slug} = await params;
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'News'});
    const article = await getArticle(slug, locale);

    if (!article) {
        notFound();
    }

    const title = locale === 'es' ? article.titleEs : article.titleEn;
    const excerpt = locale === 'es' ? article.excerptEs : article.excerptEn;
    const content = locale === 'es' ? article.contentEs : article.contentEn;
    const paragraphs = content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

    return (
        <article className="container mx-auto px-4 py-8 max-w-3xl">
            <Link href="/noticias" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
                <ChevronLeft className="h-4 w-4" />
                {t('backToNews')}
            </Link>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{title}</h1>
            {article.publishedAt && (
                <p className="text-sm text-muted-foreground mb-6">{formatDate(article.publishedAt, 'long', locale)}</p>
            )}

            {article.coverImage && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-muted mb-8">
                    <Image src={`${article.coverImage.preview}?preset=large`} alt={title} fill className="object-cover" priority />
                </div>
            )}

            <p className="text-lg text-muted-foreground leading-relaxed mb-6">{excerpt}</p>

            <div className="space-y-4">
                {paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-base leading-relaxed">
                        {paragraph}
                    </p>
                ))}
            </div>
        </article>
    );
}
