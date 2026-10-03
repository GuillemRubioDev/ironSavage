import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { ContentArticle } from './content-article.entity';
import { ContentAdminResolver } from './content-admin.resolver';
import { ContentShopResolver } from './content-shop.resolver';
import { ContentService } from './content.service';

export { contentPermission } from './content.permission';

/**
 * Plugin sencillo de noticias/artículos: los administradores gestionan los
 * artículos desde el dashboard (borrador, edición, publicar/despublicar, portada,
 * borrar); por la Shop API solo se exponen los PUBLICADOS. Totalmente independiente:
 * no modifica nada del núcleo de Vendure ni toca los plugins de Redsys,
 * fidelización, facturación o reseñas.
 *
 * Las portadas reutilizan la entidad y el almacenamiento Asset de Vendure (una
 * relación simple, `ContentArticle.coverImage`), nunca un blob en la base de datos.
 *
 * Necesita `contentPermission` registrado en `authOptions.customPermissions` de
 * vendure-config.ts, para poder asignarlo a roles como cualquier permiso estándar.
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
