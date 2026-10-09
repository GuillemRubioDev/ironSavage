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
    // La copia local del esquema de gql.tada es anterior a los campos bilingües
    // titleEs/titleEn (el mismo problema de CLI que en banners-data.ts): se fuerza el
    // tipo en vez de pelearse con la CLI, comprobado contra el esquema real.
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
        <article>
            <header className="bg-brand text-brand-fg">
                <div className="container mx-auto max-w-[68ch] px-4 pb-24 pt-10 md:pb-28 md:pt-14">
                    <Link href="/noticias" className="mb-6 inline-flex items-center gap-1 text-sm text-brand-muted transition-colors hover:text-brand-fg">
                        <ChevronLeft className="size-4" aria-hidden="true" />
                        {t('backToNews')}
                    </Link>
                    {article.publishedAt && (
                        <p className="mb-3 text-xs uppercase tracking-[.16em] text-brand-muted">{formatDate(article.publishedAt, 'long', locale)}</p>
                    )}
                    <h1 className="text-4xl md:text-6xl">{title}</h1>
                </div>
            </header>

            {/* Columna de unos 68 caracteres: la medida cómoda para leer. */}
            <div className="container mx-auto max-w-[68ch] px-4 pb-16">
                {article.coverImage ? (
                    <div className="relative -mt-16 mb-10 aspect-video overflow-hidden rounded-xl bg-muted shadow-xl md:-mt-20">
                        <Image src={article.coverImage.preview} alt={title} fill sizes="(min-width: 768px) 720px, 100vw" className="object-cover" priority />
                    </div>
                ) : (
                    <div className="h-10" />
                )}

                <p className="mb-8 text-xl leading-relaxed text-muted-foreground">{excerpt}</p>

                <div className="space-y-6">
                    {paragraphs.map((paragraph, index) => (
                        <p key={index} className="text-lg leading-8">
                            {paragraph}
                        </p>
                    ))}
                </div>
            </div>
        </article>
    );
}
