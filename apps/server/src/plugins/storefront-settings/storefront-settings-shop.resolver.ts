import { Query, Resolver } from '@nestjs/graphql';
import { Asset, Ctx, GlobalSettings, RequestContext, ShippingMethodService, TransactionalConnection } from '@vendure/core';

import { FreeShippingThreshold, freeShippingThreshold } from './free-shipping';

/** Consulta pública con los ajustes de la tienda que necesita el storefront. */
@Resolver()
export class StorefrontSettingsShopResolver {
    constructor(
        private connection: TransactionalConnection,
        private shippingMethodService: ShippingMethodService,
    ) {}

    @Query()
    async storefrontSettings(@Ctx() ctx: RequestContext): Promise<{
        authPanelImage: Asset | null;
        freeShippingThreshold: FreeShippingThreshold | null;
    }> {
        // GlobalSettingsService.getSettings usa un QueryBuilder, que no carga relaciones
        // (ni eager): la imagen se pide aquí de forma explícita.
        const [settings] = await this.connection.getRepository(ctx, GlobalSettings).find({
            order: { createdAt: 'ASC' },
            take: 1,
            relations: ['customFields.authPanelImage'],
        });
        const customFields = settings?.customFields as { authPanelImage?: Asset | null } | undefined;
        const methods = await this.shippingMethodService.getActiveShippingMethods(ctx);
        return {
            authPanelImage: customFields?.authPanelImage ?? null,
            freeShippingThreshold: freeShippingThreshold(methods, ctx.channel.pricesIncludeTax),
        };
    }
}
