import Image from 'next/image';
import {Link} from '@/platform/i18n/navigation';
import {formatDate} from '@/platform/i18n/format';
import {ImageOff} from 'lucide-react';

interface ArticleCardProps {
    article: {
        slug: string;
        title: string;
        excerpt: string;
        publishedAt: string | null;
        coverImage?: {preview: string} | null;
    };
    locale: string;
}

export function ArticleCard({article, locale}: ArticleCardProps) {
    return (
        <Link
            href={`/noticias/${article.slug}`}
            className="group block rounded-xl border border-border overflow-hidden bg-card hover:shadow-lg transition-shadow duration-200"
        >
            <div className="relative aspect-video bg-muted">
                {article.coverImage ? (
                    <Image
                        src={`${article.coverImage.preview}?preset=medium`}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                <h3 className="font-semibold text-lg leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
            </div>
        </Link>
    );
}
