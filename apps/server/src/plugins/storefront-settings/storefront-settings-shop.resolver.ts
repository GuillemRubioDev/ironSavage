import { Query, Resolver } from '@nestjs/graphql';
import { Asset, Ctx, GlobalSettings, RequestContext, TransactionalConnection } from '@vendure/core';

/** Consulta pública con los ajustes de la tienda que necesita el storefront. */
@Resolver()
export class StorefrontSettingsShopResolver {
    constructor(private connection: TransactionalConnection) {}

    @Query()
    async storefrontSettings(@Ctx() ctx: RequestContext): Promise<{ authPanelImage: Asset | null }> {
        // GlobalSettingsService.getSettings usa un QueryBuilder, que no carga relaciones
        // (ni eager): la imagen se pide aquí de forma explícita.
        const [settings] = await this.connection.getRepository(ctx, GlobalSettings).find({
            order: { createdAt: 'ASC' },
            take: 1,
            relations: ['customFields.authPanelImage'],
        });
        const customFields = settings?.customFields as { authPanelImage?: Asset | null } | undefined;
        return { authPanelImage: customFields?.authPanelImage ?? null };
    }
}
