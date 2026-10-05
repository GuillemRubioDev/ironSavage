import { Query, Resolver } from '@nestjs/graphql';
import { Asset, Ctx, GlobalSettingsService, RequestContext } from '@vendure/core';

/** Consulta pública con los ajustes de la tienda que necesita el storefront. */
@Resolver()
export class StorefrontSettingsShopResolver {
    constructor(private globalSettingsService: GlobalSettingsService) {}

    @Query()
    async storefrontSettings(@Ctx() ctx: RequestContext): Promise<{ authPanelImage: Asset | null }> {
        const settings = await this.globalSettingsService.getSettings(ctx);
        // authPanelImage es una relación eager: viene cargada con los ajustes.
        const customFields = settings.customFields as { authPanelImage?: Asset | null };
        return { authPanelImage: customFields.authPanelImage ?? null };
    }
}
