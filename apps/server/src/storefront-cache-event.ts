import { RequestContext, VendureEvent } from '@vendure/core';

/**
 * Etiquetas de caché del storefront que se pueden invalidar (ver
 * apps/storefront/src/platform/revalidation/handler.ts). Son las etiquetas
 * "generales": cada una cubre todas sus páginas en todos los idiomas y monedas.
 */
export type StorefrontCacheTag = 'products' | 'collection' | 'collections' | 'banners' | 'news';

/**
 * Lo publican los plugins propios cuyo contenido muestra el storefront (banners,
 * noticias) al crear, editar o borrar algo; StorefrontRevalidationSubscriber lo
 * escucha y avisa al storefront. Así ningún plugin depende de otro para refrescar
 * la tienda.
 */
export class StorefrontCacheEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public tags: StorefrontCacheTag[],
    ) {
        super();
    }
}
