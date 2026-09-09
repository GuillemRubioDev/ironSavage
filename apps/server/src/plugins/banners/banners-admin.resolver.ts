import { Args, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ErrorCode } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, ID, RequestContext } from '@vendure/core';

import { bannerPermission } from './banner.permission';
import { BannerInput, BannerMutationResult, BannersService } from './banners.service';

// Vendure auto-derives this ErrorCode value from the `BannerError` type
// name (see api-extensions.ts) — the generated TS enum doesn't know about it.
const BANNER_ERROR = 'BANNER_ERROR' as ErrorCode;

class BannerError {
    readonly errorCode = BANNER_ERROR;
    constructor(readonly message: string) {}
}

@Resolver()
export class BannersAdminResolver {
    constructor(private bannersService: BannersService) {}

    @Query()
    @Allow(bannerPermission.Read)
    adminBanners(@Ctx() ctx: RequestContext, @Args() args: { options?: { skip?: number; take?: number } }) {
        return this.bannersService.listForAdmin(ctx, args.options);
    }

    @Query()
    @Allow(bannerPermission.Read)
    adminBanner(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.bannersService.findById(ctx, id);
    }

    @Mutation()
    @Allow(bannerPermission.Create)
    async createBanner(@Ctx() ctx: RequestContext, @Args('input') input: BannerInput) {
        const result = await this.bannersService.create(ctx, input);
        return this.toGraphQlResult(result);
    }

    @Mutation()
    @Allow(bannerPermission.Update)
    async updateBanner(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: Partial<BannerInput>) {
        const result = await this.bannersService.update(ctx, id, input);
        return this.toGraphQlResult(result);
    }

    @Mutation()
    @Allow(bannerPermission.Delete)
    deleteBanner(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.bannersService.delete(ctx, id);
    }

    @ResolveField('__resolveType')
    @Resolver('CreateBannerResult')
    resolveCreateType(value: BannerError | { id: unknown }): string {
        return 'errorCode' in value ? 'BannerError' : 'Banner';
    }

    @ResolveField('__resolveType')
    @Resolver('UpdateBannerResult')
    resolveUpdateType(value: BannerError | { id: unknown }): string {
        return 'errorCode' in value ? 'BannerError' : 'Banner';
    }

    private toGraphQlResult(result: BannerMutationResult) {
        return result.success ? result.banner : new BannerError(result.reason);
    }
}
