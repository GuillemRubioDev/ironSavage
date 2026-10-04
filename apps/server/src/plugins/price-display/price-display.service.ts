import { Injectable } from '@nestjs/common';
import { ID, Product, ProductVariant, ProductVariantService, PromotionService, RequestContext, TransactionalConnection } from '@vendure/core';
import { IsNull } from 'typeorm';

import { applyPercentDiscount, discountPercentFor, DisplayVariant, PublicPromotion, publicPromotionFrom } from './discount-rules';

/**
 * Calcula el precio con IVA que la ficha de producto muestra tras los descuentos
 * visibles (ver discount-rules.ts). Las promociones se cargan una vez por petición:
 * un listado pide el precio de muchos productos seguidos.
 */
@Injectable()
export class PriceDisplayService {
    private readonly promotionsByRequest = new WeakMap<RequestContext, Promise<PublicPromotion[]>>();

    constructor(
        private connection: TransactionalConnection,
        private promotionService: PromotionService,
        private productVariantService: ProductVariantService,
    ) {}

    async discountedVariantPriceWithTax(ctx: RequestContext, variant: ProductVariant): Promise<number> {
        const loaded = (await this.loadVariantWithRelations(ctx, variant.id)) ?? variant;
        const displayVariant = await this.toDisplayVariant(ctx, loaded);
        return this.discounted(displayVariant, await this.publicPromotions(ctx));
    }

    /** Rango de precios con descuento de los variantes habilitados de un producto. */
    async discountedProductPriceRange(ctx: RequestContext, productId: ID): Promise<{ min: number; max: number }> {
        // Solo variantes vivos que se venden en este canal: las variantes borradas
        // (soft-delete) siguen en la tabla y el repositorio no las filtra solo.
        const variants = await this.connection.getRepository(ctx, ProductVariant).find({
            where: {
                product: { id: productId as string },
                enabled: true,
                deletedAt: IsNull(),
                channels: { id: ctx.channelId },
            },
            relations: { product: { facetValues: true }, facetValues: true },
        });
        const promotions = await this.publicPromotions(ctx);
        const prices: number[] = [];
        for (const variant of variants) {
            prices.push(this.discounted(await this.toDisplayVariant(ctx, variant), promotions));
        }
        if (prices.length === 0) {
            return { min: 0, max: 0 };
        }
        return { min: Math.min(...prices), max: Math.max(...prices) };
    }

    async productHasNewness(ctx: RequestContext, productId: ID): Promise<boolean> {
        const product = await this.connection.getRepository(ctx, Product).findOne({ where: { id: productId as string } });
        if (product?.customFields.isNew) {
            return true;
        }
        const variants = await this.connection.getRepository(ctx, ProductVariant).find({
            where: { product: { id: productId as string }, deletedAt: IsNull() },
        });
        return variants.some(variant => variant.customFields.isNew === true);
    }

    private publicPromotions(ctx: RequestContext): Promise<PublicPromotion[]> {
        let promotions = this.promotionsByRequest.get(ctx);
        if (!promotions) {
            promotions = this.promotionService.getActivePromotionsInChannel(ctx).then(active => {
                const now = new Date();
                return active.flatMap(promotion => {
                    const publicPromotion = publicPromotionFrom(promotion, now);
                    return publicPromotion ? [publicPromotion] : [];
                });
            });
            this.promotionsByRequest.set(ctx, promotions);
        }
        return promotions;
    }

    private loadVariantWithRelations(ctx: RequestContext, variantId: ID): Promise<ProductVariant | null> {
        return this.connection.getRepository(ctx, ProductVariant).findOne({
            where: { id: variantId as string },
            relations: { product: { facetValues: true }, facetValues: true },
        });
    }

    private async toDisplayVariant(ctx: RequestContext, variant: ProductVariant): Promise<DisplayVariant> {
        const priceWithTax = await this.productVariantService.hydratePriceFields(ctx, variant, 'priceWithTax');
        const price = await this.productVariantService.hydratePriceFields(ctx, variant, 'price');
        const facetValueIds = [...(variant.facetValues ?? []), ...(variant.product?.facetValues ?? [])].map(fv => String(fv.id));
        return { id: String(variant.id), facetValueIds, priceWithTax, price };
    }

    private discounted(variant: DisplayVariant, promotions: PublicPromotion[]): number {
        return applyPercentDiscount(variant.priceWithTax, discountPercentFor(variant, promotions));
    }
}
