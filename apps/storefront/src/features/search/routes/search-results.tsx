import {getRouteLocale} from "@/platform/i18n/server";
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {CatalogResults} from '@/features/search/catalog-results';
import {buildSearchInput, getCurrentPage} from "@/features/search/search-helpers";
import {query} from "@/platform/vendure/api";
import {SearchProductsQuery} from '@/features/search/graphql';

interface SearchResultsProps {
    searchParams: Promise<{
        page?: string
    }>
}

export async function SearchResults({searchParams}: SearchResultsProps) {
    const searchParamsResolved = await searchParams;
    const locale = await getRouteLocale();
    const currencyCode = await getActiveCurrencyCode();
    const page = getCurrentPage(searchParamsResolved);

    const productDataPromise = query(SearchProductsQuery, {
        input: buildSearchInput({searchParams: searchParamsResolved})
    }, {languageCode: locale, currencyCode});


    return <CatalogResults productDataPromise={productDataPromise} currentPage={page} showCount />;
}
