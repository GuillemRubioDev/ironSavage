import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { Banner } from './banner.entity';
import { BannersAdminResolver } from './banners-admin.resolver';
import { BannersShopResolver } from './banners-shop.resolver';
import { BannersService } from './banners.service';

/**
 * Diapositivas del carrusel de la portada gestionables desde el panel (las que van
 * después de la fija de marca, que sigue en el código; ver
 * apps/storefront/src/site/home/promo-carousel.tsx). Totalmente independiente: no
 * modifica nada del núcleo de Vendure ni toca Redsys, fidelización, facturación,
 * reseñas, promociones ni contenido.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [BannersService],
    entities: [Banner],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [BannersShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [BannersAdminResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class BannersPlugin {}
