import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {ListingHeader} from '@/features/products/listing-header';

interface SearchTermProps {
    searchParams: Promise<{
        q?: string
    }>;
}

export async function SearchTerm({searchParams}: SearchTermProps) {
    const searchParamsResolved = await searchParams;
    const searchTerm = (searchParamsResolved.q as string) || '';
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Search'});

    return (
        <ListingHeader
            crumbs={[{label: t('home'), href: '/'}, {label: t('title')}]}
            title={searchTerm ? t('resultsFor', {query: searchTerm}) : t('title')}
        />
    )
}
