import { Args, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ErrorCode } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, CustomerService, ID, Permission, RequestContext } from '@vendure/core';

import { CreateReviewInput, ReviewMutationResult, ReviewsService, UpdateReviewInput } from './reviews.service';

// Vendure auto-derives this ErrorCode value from the `ProductReviewError` type
// name below (see api-extensions.ts) — the generated TS enum doesn't know about it.
const PRODUCT_REVIEW_ERROR = 'PRODUCT_REVIEW_ERROR' as ErrorCode;

class ProductReviewError {
    readonly errorCode = PRODUCT_REVIEW_ERROR;
    constructor(readonly message: string) {}
}

@Resolver()
export class ReviewsShopResolver {
    constructor(
        private reviewsService: ReviewsService,
        private customerService: CustomerService,
    ) {}

    @Query()
    productReviews(@Ctx() ctx: RequestContext, @Args('productId') productId: ID, @Args() args: { options?: { skip?: number; take?: number } }) {
        return this.reviewsService.listApprovedForProduct(ctx, productId, args.options);
    }

    @Query()
    productReviewSummary(@Ctx() ctx: RequestContext, @Args('productId') productId: ID) {
        return this.reviewsService.getSummaryForProduct(ctx, productId);
    }

    @Query()
    @Allow(Permission.Owner)
    async myReviewableOrdersForProduct(@Ctx() ctx: RequestContext, @Args('productId') productId: ID) {
        const customer = await this.getActiveCustomer(ctx);
        if (!customer) {
            return [];
        }
        return this.reviewsService.listReviewableOrdersForProduct(ctx, customer.id, productId);
    }

    @Mutation()
    @Allow(Permission.Owner)
    async createProductReview(@Ctx() ctx: RequestContext, @Args('input') input: CreateReviewInput) {
        const customer = await this.getActiveCustomer(ctx);
        if (!customer) {
            return new ProductReviewError('You must be signed in to leave a review');
        }
        const result = await this.reviewsService.createReview(ctx, customer.id, input);
        return this.toGraphQlResult(result);
    }

    @Mutation()
    @Allow(Permission.Owner)
    async updateProductReview(@Ctx() ctx: RequestContext, @Args('input') input: UpdateReviewInput) {
        const customer = await this.getActiveCustomer(ctx);
        if (!customer) {
            return new ProductReviewError('You must be signed in to edit a review');
        }
        const result = await this.reviewsService.updateReview(ctx, customer.id, input);
        return this.toGraphQlResult(result);
    }

    @ResolveField('__resolveType')
    @Resolver('CreateProductReviewResult')
    resolveCreateType(value: ProductReviewError | { id: unknown }): string {
        return 'errorCode' in value ? 'ProductReviewError' : 'ProductReview';
    }

    @ResolveField('__resolveType')
    @Resolver('UpdateProductReviewResult')
    resolveUpdateType(value: ProductReviewError | { id: unknown }): string {
        return 'errorCode' in value ? 'ProductReviewError' : 'ProductReview';
    }

    private toGraphQlResult(result: ReviewMutationResult) {
        return result.success ? result.review : new ProductReviewError(result.reason);
    }

    private async getActiveCustomer(ctx: RequestContext) {
        if (!ctx.activeUserId) {
            return null;
        }
        return (await this.customerService.findOneByUserId(ctx, ctx.activeUserId)) ?? null;
    }
}
