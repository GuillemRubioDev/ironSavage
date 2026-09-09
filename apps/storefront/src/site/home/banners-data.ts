import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetActiveBannersQuery} from './banners-graphql';
import type {PromoBanner} from './promo-carousel';

export async function getActiveBanners(): Promise<PromoBanner[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('banners');

    const result = await query(GetActiveBannersQuery);
    // gql.tada's local schema snapshot (src/graphql-env.d.ts) predates the
    // server's new `activeBanners` query, so it types this field as
    // `unknown` until that snapshot is regenerated against the live
    // schema (`npx gql.tada generate-output` from apps/storefront — the
    // CLI produced no output/error in this environment when tried, so
    // regeneration is still pending; runtime behavior is unaffected,
    // verified against the live server).
    return result.data.activeBanners as PromoBanner[];
}
