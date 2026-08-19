import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';

import { ContentService } from './content.service';

@Resolver()
export class ContentShopResolver {
    constructor(private contentService: ContentService) {}

    @Query()
    articles(@Ctx() ctx: RequestContext, @Args() args: { options?: { skip?: number; take?: number } }) {
        return this.contentService.listPublished(ctx, args.options);
    }

    @Query()
    article(@Ctx() ctx: RequestContext, @Args('slug') slug: string) {
        return this.contentService.findPublishedBySlug(ctx, slug);
    }
}
