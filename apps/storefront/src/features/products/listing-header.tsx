import type {ReactNode} from 'react';
import {ChevronRight} from 'lucide-react';
import {BrandBand} from '@/components/brand/brand-band';
import {Link} from '@/platform/i18n/navigation';

/** Cabecera de los listados: franja oscura con migas de pan, título grande y nº de productos. */
export function ListingHeader({crumbs, title, count, watermark}: {
    crumbs: Array<{label: string; href?: string}>;
    title: string;
    count?: ReactNode;
    watermark?: string;
}) {
    return (
        <BrandBand
            watermark={watermark}
            title={title}
            eyebrow={
                <nav aria-label="breadcrumb">
                    <ol className="flex flex-wrap items-center gap-1">
                        {crumbs.map((crumb, i) => (
                            <li key={`${i}-${crumb.label}`} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight className="size-3" aria-hidden="true" />}
                                {crumb.href ? (
                                    <Link href={crumb.href} className="transition-colors hover:text-brand-fg">{crumb.label}</Link>
                                ) : (
                                    <span aria-current="page" className="text-brand-fg">{crumb.label}</span>
                                )}
                            </li>
                        ))}
                    </ol>
                </nav>
            }
        >
            {count && <p className="mt-2 text-sm text-brand-muted">{count}</p>}
        </BrandBand>
    );
}
