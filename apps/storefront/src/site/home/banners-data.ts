import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetActiveBannersQuery} from './banners-graphql';
import type {PromoBanner} from './promo-carousel';

export async function getActiveBanners(): Promise<PromoBanner[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag('banners');

    const result = await query(GetActiveBannersQuery);
    // La copia local del esquema de gql.tada (src/graphql-env.d.ts) es anterior a la
    // consulta `activeBanners` del servidor, así que tipa este campo como `unknown`
    // hasta que se regenere contra el esquema real (`npx gql.tada generate-output`
    // desde apps/storefront; al probarlo en este entorno la CLI no dio salida ni
    // error, así que sigue pendiente. En ejecución funciona bien, comprobado contra
    // el servidor real).
    return result.data.activeBanners as PromoBanner[];
}
