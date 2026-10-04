'use client';

import {X} from 'lucide-react';
import {useSearchParams} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {withFacets} from '@/features/search/search-helpers';

/** Etiquetas de los filtros activos encima de la rejilla; cada una quita su filtro. */
export function ActiveFilters({facetValues}: {facetValues: Array<{id: string; name: string}>}) {
    const t = useTranslations('Filters');
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    const selected = searchParams.getAll('facets');
    const active = selected
        .map(id => facetValues.find(value => value.id === id))
        .filter((value): value is {id: string; name: string} => Boolean(value));
    if (!active.length) return null;

    const go = (ids: string[]) => router.push(`${pathname}?${withFacets(new URLSearchParams(searchParams), ids)}`);

    return (
        <ul aria-label={t('activeFilters')} className="flex flex-wrap items-center gap-2">
            {active.map(value => (
                <li key={value.id}>
                    <button
                        type="button"
                        onClick={() => go(selected.filter(id => id !== value.id))}
                        aria-label={t('removeFilter', {name: value.name})}
                        className="press inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold transition-colors hover:border-foreground"
                    >
                        {value.name}
                        <X className="size-3" aria-hidden="true" />
                    </button>
                </li>
            ))}
            {active.length > 1 && (
                <li>
                    <button type="button" onClick={() => go([])} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                        {t('clearAll')}
                    </button>
                </li>
            )}
        </ul>
    );
}
