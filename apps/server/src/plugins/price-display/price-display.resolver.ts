import { Ctx, ID, ProductVariant, RequestContext } from '@vendure/core';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { PriceDisplayService } from './price-display.service';

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomProductFields {
        isNew?: boolean | null;
    }
    interface CustomProductVariantFields {
        isNew?: boolean | null;
    }
}

@Resolver('ProductVariant')
export class ProductVariantPriceResolver {
    constructor(private priceDisplay: PriceDisplayService) {}

    @ResolveField()
    discountedPriceWithTax(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        return this.priceDisplay.discountedVariantPriceWithTax(ctx, variant);
    }
}

@Resolver('SearchResult')
export class SearchResultPriceResolver {
    constructor(private priceDisplay: PriceDisplayService) {}

    @ResolveField()
    discountedPriceWithTax(
        @Ctx() ctx: RequestContext,
        @Parent() result: { productId: ID },
    ): Promise<{ min: number; max: number }> {
        return this.priceDisplay.discountedProductPriceRange(ctx, result.productId);
    }

    /** Novedad si lo está el producto o cualquiera de sus variantes (p. ej. un tamaño nuevo). */
    @ResolveField()
    isNew(@Ctx() ctx: RequestContext, @Parent() result: { productId: ID }): Promise<boolean> {
        return this.priceDisplay.productHasNewness(ctx, result.productId);
    }
}
