import Image from 'next/image';
import {Link} from '@/platform/i18n/navigation';
import {formatDate} from '@/platform/i18n/format';
import {ImageOff} from 'lucide-react';

interface ArticleCardProps {
    article: {
        slug: string;
        titleEs: string;
        titleEn: string;
        excerptEs: string;
        excerptEn: string;
        publishedAt: string | null;
        coverImage?: {preview: string} | null;
    };
    locale: string;
    /** h2 en el listado de noticias (bajo su h1); h3 donde la tarjeta va bajo otro h2 (portada). */
    headingLevel?: 'h2' | 'h3';
}

export function ArticleCard({article, locale, headingLevel = 'h3'}: ArticleCardProps) {
    const Heading = headingLevel;
    const title = locale === 'es' ? article.titleEs : article.titleEn;
    const excerpt = locale === 'es' ? article.excerptEs : article.excerptEn;

    return (
        <Link
            href={`/noticias/${article.slug}`}
            className="hover-lift img-zoom group block overflow-hidden rounded-lg border border-border bg-card"
        >
            <div className="relative aspect-video bg-muted">
                {article.coverImage ? (
                    <Image
                        src={`${article.coverImage.preview}?preset=medium`}
                        alt={title}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-8 w-8" />
                    </div>
                )}
            </div>
            <div className="p-5 space-y-2">
                {article.publishedAt && (
                    <p className="text-xs text-muted-foreground">{formatDate(article.publishedAt, 'long', locale)}</p>
                )}
                <Heading className="text-2xl leading-tight transition-colors group-hover:text-primary">
                    {title}
                </Heading>
                <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
            </div>
        </Link>
    );
}
