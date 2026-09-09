import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { Banner } from './banner.entity';
import { BannersAdminResolver } from './banners-admin.resolver';
import { BannersShopResolver } from './banners-shop.resolver';
import { BannersService } from './banners.service';

/**
 * Admin-manageable slides for the storefront home carousel (the slides
 * after the fixed brand/hero slide, which stays hardcoded — see
 * apps/storefront/src/site/home/promo-carousel.tsx). Entirely self-contained
 * — no core Vendure behaviour modified, doesn't touch Redsys/Loyalty/
 * Invoicing/Reviews/Promotions/Content.
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
