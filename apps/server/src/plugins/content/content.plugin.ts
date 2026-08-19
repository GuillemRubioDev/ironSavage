import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { ContentArticle } from './content-article.entity';
import { ContentAdminResolver } from './content-admin.resolver';
import { ContentShopResolver } from './content-shop.resolver';
import { ContentService } from './content.service';

export { contentPermission } from './content.permission';

/**
 * Simple news/content article plugin: admins manage articles (draft, edit,
 * publish/unpublish, set a cover image, delete) from the Dashboard; only
 * PUBLISHED articles are ever exposed via the Shop API. Entirely
 * self-contained — no core Vendure behaviour modified, and it doesn't touch
 * the Redsys, Loyalty, Invoicing, or Reviews plugins.
 *
 * Cover images reuse Vendure's own Asset entity/storage (a plain relation,
 * `ContentArticle.coverImage`) — never a DB blob.
 *
 * Requires `contentPermission` to be registered in `authOptions.customPermissions`
 * in vendure-config.ts (see that file), so it can be assigned to Roles in the
 * Admin UI like any built-in permission.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [ContentService],
    entities: [ContentArticle],
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [ContentShopResolver],
    },
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [ContentAdminResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class ContentPlugin {}
