import {ArrowRight} from 'lucide-react';
import {Link} from '@/platform/i18n/navigation';

/** Titular de sección: palabra destacada en rojo y enlace opcional "Ver todos". */
export function SectionHeader({title, highlight, action, tone = 'content'}: {
    title: string;
    highlight?: string;
    action?: {href: string; label: string};
    tone?: 'content' | 'brand';
}) {
    const accent = tone === 'brand' ? 'text-primary-text' : 'text-primary-solid';
    return (
        <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-4xl md:text-5xl">
                {title}
                {highlight && <> <span className={accent}>{highlight}</span></>}
            </h2>
            {action && (
                <Link href={action.href} className={`press inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${accent}`}>
                    {action.label} <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}
