import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { ProductReview } from './product-review.entity';
import { ReviewsAdminResolver } from './reviews-admin.resolver';
import { ReviewsShopResolver } from './reviews-shop.resolver';
import { ReviewsService } from './reviews.service';

/**
 * Reseñas de productos: los clientes con sesión iniciada pueden reseñar un producto
 * que hayan comprado en un pedido pagado correctamente, y solo se muestran en
 * público las reseñas APPROVED. Totalmente independiente: no modifica nada del
 * núcleo de Vendure ni toca los plugins de Redsys, fidelización o facturación.
 *
 * «Comprado y pagado» se vuelve a comprobar en la base de datos en cada escritura
 * (ver ReviewsService.assertPurchased): el id del cliente sale de la sesión, nunca
 * de lo que diga el navegador, y tampoco se acepta sin comprobar qué pedido o
 * producto se compró.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [ReviewsService],
    entities: [ProductReview],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ReviewsShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [ReviewsAdminResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class ReviewsPlugin {}
