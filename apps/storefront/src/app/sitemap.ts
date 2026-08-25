import type {MetadataRoute} from 'next';
import {query} from '@/platform/vendure/api';
import {GetArticlesQuery} from '@/features/news/graphql';
import {SITE_URL, localizedPath} from '@/config/metadata';
import {routing} from '@/platform/i18n/routing';

const STATIC_PATHS = [
    '/',
    '/productos',
    '/noticias',
    '/aviso-legal',
    '/politica-de-privacidad',
    '/politica-de-cookies',
    '/terminos-y-condiciones',
    '/envios-y-devoluciones',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = SITE_URL.replace(/\/$/, '');
    const entries: MetadataRoute.Sitemap = [];

    for (const path of STATIC_PATHS) {
        for (const locale of routing.locales) {
            entries.push({url: `${baseUrl}${localizedPath(locale, path)}`});
        }
    }

    const {data} = await query(GetArticlesQuery, {options: {take: 100}});
    for (const article of data.articles.items) {
        for (const locale of routing.locales) {
            entries.push({
                url: `${baseUrl}${localizedPath(locale, `/noticias/${article.slug}`)}`,
                ...(article.publishedAt && {lastModified: article.publishedAt}),
            });
        }
    }

    return entries;
}
