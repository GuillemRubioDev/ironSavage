import { Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';

import { BannersService } from './banners.service';

@Resolver()
export class BannersShopResolver {
    constructor(private bannersService: BannersService) {}

    @Query()
    activeBanners(@Ctx() ctx: RequestContext) {
        return this.bannersService.listActive(ctx);
    }
}
