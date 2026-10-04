import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api-extensions';
import { PriceDisplayService } from './price-display.service';
import { ProductVariantPriceResolver, SearchResultPriceResolver } from './price-display.resolver';
import { StorefrontRevalidationSubscriber } from './storefront-revalidation.subscriber';

/**
 * Precio "antes / ahora" en la ficha y en los listados. No define descuentos
 * nuevos: los crea el administrador como promociones nativas de Vendure (producto
 * concreto o grupo por faceta). Este plugin solo expone el precio que resulta de
 * esas promociones, para que la tienda lo muestre tal como lo cobra el carrito.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [PriceDisplayService, StorefrontRevalidationSubscriber],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ProductVariantPriceResolver, SearchResultPriceResolver],
    },
    compatibility: '^3.0.0',
})
export class PriceDisplayPlugin {}
