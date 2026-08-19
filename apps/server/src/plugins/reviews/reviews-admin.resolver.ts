import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, Permission, ProductService, RequestContext } from '@vendure/core';

import { ProductReview } from './product-review.entity';
import { ReviewsService } from './reviews.service';

@Resolver('ProductReview')
export class ReviewsAdminResolver {
    constructor(
        private reviewsService: ReviewsService,
        private productService: ProductService,
    ) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    adminProductReviews(
        @Ctx() ctx: RequestContext,
        @Args()
        args: {
            options?: {
                skip?: number;
                take?: number;
                filter?: { status?: { eq?: string }; productSearch?: { contains?: string } };
                sort?: { createdAt?: 'ASC' | 'DESC'; rating?: 'ASC' | 'DESC' };
            };
        },
    ) {
        return this.reviewsService.listForAdmin(ctx, args.options);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    approveProductReview(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.reviewsService.approveReview(ctx, id);
    }

    @Mutation()
    @Allow(Permission.UpdateCatalog)
    rejectProductReview(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.reviewsService.rejectReview(ctx, id);
    }

    @ResolveField()
    async productName(@Ctx() ctx: RequestContext, @Parent() review: ProductReview): Promise<string | undefined> {
        const product = await this.productService.findOne(ctx, review.productId);
        return product?.name;
    }
}
