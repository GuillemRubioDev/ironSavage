'use client';

import { use, useOptimistic, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/platform/i18n/navigation';
import { ResultOf } from '@/platform/vendure/graphql';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { withFacets } from '@/features/search/search-helpers';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import {SearchProductsQuery} from '@/features/search/graphql';
import {useTranslations} from 'next-intl';

interface FacetFiltersProps {
    productDataPromise: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    /** Total de productos visibles (sin los ocultos en la tienda), el mismo que la franja. */
    visibleTotalPromise: Promise<number>;
}

function FilterContent({
    facetGroups,
    selectedFacets,
    toggleFacet,
    clearFilters,
    hasActiveFilters,
}: {
    facetGroups: Record<string, { id: string; name: string; values: Array<{ id: string; name: string; count: number }> }>;
    selectedFacets: string[];
    toggleFacet: (facetId: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
}) {
    const t = useTranslations('Filters');
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between pb-4 border-b border-border">
                <h2 className="text-display text-lg font-bold">{t('title')}</h2>
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs font-medium uppercase tracking-wide text-primary hover:bg-transparent hover:text-primary/80">
                        {t('clearAll')}
                    </Button>
                )}
            </div>

            {Object.entries(facetGroups).map(([facetName, facet]) => (
                <Collapsible key={facet.id} defaultOpen className="border-b border-border last:border-b-0">
                    <div className="py-4">
                        <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide">
                            {facetName}
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-panel-open]_&]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="space-y-3 pt-4">
                                {facet.values.map((value) => {
                                    const isChecked = selectedFacets.includes(value.id);
                                    return (
                                        <div key={value.id} className="flex items-center gap-2.5">
                                            <Checkbox
                                                id={`filter-${value.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleFacet(value.id)}
                                            />
                                            <Label
                                                htmlFor={`filter-${value.id}`}
                                                className="text-sm font-medium cursor-pointer flex items-center gap-1.5"
                                            >
                                                {value.name}
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    ({value.count})
                                                </span>
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            ))}
        </div>
    );
}

export function FacetFilters({ productDataPromise, visibleTotalPromise }: FacetFiltersProps) {
    const t = useTranslations('Filters');
    const result = use(productDataPromise);
    const visibleTotal = use(visibleTotalPromise);
    const searchResult = result.data.search;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);

    // Agrupa los valores de filtro por filtro
    interface FacetGroup {
        id: string;
        name: string;
        values: Array<{ id: string; name: string; count: number }>;
    }

    const facetGroups = searchResult.facetValues.reduce((acc: Record<string, FacetGroup>, item) => {
        const facetName = item.facetValue.facet.name;
        if (!acc[facetName]) {
            acc[facetName] = {
                id: item.facetValue.facet.id,
                name: facetName,
                values: []
            };
        }
        acc[facetName].values.push({
            id: item.facetValue.id,
            name: item.facetValue.name,
            count: item.count
        });
        return acc;
    }, {});

    // Lista optimista: si se marcan varios filtros antes de que acabe la navegación, cada
    // toque parte de lo ya marcado y no de la URL vieja (no se pierde ninguno).
    const urlFacets = searchParams.getAll('facets');
    const [selectedFacets, setOptimisticFacets] = useOptimistic(urlFacets);
    const [, startTransition] = useTransition();

    // Marcar o quitar un filtro navega al momento; en móvil el panel sigue abierto
    // para poder marcar varios y se cierra con "Ver X productos".
    const toggleFacet = (facetId: string) => {
        const next = selectedFacets.includes(facetId)
            ? selectedFacets.filter(id => id !== facetId)
            : [...selectedFacets, facetId];
        startTransition(() => {
            setOptimisticFacets(next);
            router.push(`${pathname}?${withFacets(new URLSearchParams(searchParams), next)}`);
        });
    };

    const clearFilters = () => {
        startTransition(() => {
            setOptimisticFacets([]);
            router.push(`${pathname}?${withFacets(new URLSearchParams(searchParams), [])}`);
        });
    };

    const hasActiveFilters = selectedFacets.length > 0;

    if (Object.keys(facetGroups).length === 0) {
        return null;
    }

    const filterContentProps = {
        facetGroups,
        selectedFacets,
        toggleFacet,
        clearFilters,
        hasActiveFilters,
    };

    return (
        <>
            {/* Móvil: botón que abre el panel */}
            <div className="lg:hidden">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger
                        render={
                            <Button variant="outline" className="w-full">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                {t('filtersButton')}
                                {hasActiveFilters && (
                                    <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-solid text-[10px] font-bold text-primary-foreground">
                                        {selectedFacets.length}
                                    </span>
                                )}
                            </Button>
                        }
                    />
                    <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl p-6">
                        <SheetHeader className="sr-only">
                            <SheetTitle>{t('title')}</SheetTitle>
                        </SheetHeader>
                        <div>
                            <FilterContent {...filterContentProps} />
                        </div>
                        <div className="sticky bottom-0 -mx-6 mt-4 border-t border-border bg-background px-6 pt-4">
                            <SheetClose render={<Button size="lg" className="w-full" />}>
                                {t('showResults', {count: visibleTotal})}
                            </SheetClose>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Escritorio: filtros en la página */}
            <div className="hidden lg:block">
                <FilterContent {...filterContentProps} />
            </div>
        </>
    );
}
