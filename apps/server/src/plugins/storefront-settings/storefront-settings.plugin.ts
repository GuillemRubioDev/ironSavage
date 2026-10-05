import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api-extensions';
import { StorefrontSettingsShopResolver } from './storefront-settings-shop.resolver';

/**
 * Publica en la Shop API los ajustes globales que necesita el storefront sin sesión
 * (la imagen del panel de acceso, GlobalSettings.authPanelImage, y el pedido mínimo
 * del envío gratis, sacado de los métodos de envío activos). El campo
 * personalizado se define en vendure-config.ts, como los demás.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [StorefrontSettingsShopResolver],
    },
    compatibility: '^3.0.0',
})
export class StorefrontSettingsPlugin {}
