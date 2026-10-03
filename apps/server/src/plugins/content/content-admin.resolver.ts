import { Args, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ErrorCode } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, ID, RequestContext } from '@vendure/core';

import { contentPermission } from './content.permission';
import { ArticleInput, ArticleMutationResult, ContentService } from './content.service';

// Vendure deduce este valor de ErrorCode del nombre del tipo `ContentArticleError`
// (ver api-extensions.ts); el enum de TypeScript generado no lo conoce.
const CONTENT_ARTICLE_ERROR = 'CONTENT_ARTICLE_ERROR' as ErrorCode;

class ContentArticleError {
    readonly errorCode = CONTENT_ARTICLE_ERROR;
    constructor(readonly message: string) {}
}

@Resolver()
export class ContentAdminResolver {
    constructor(private contentService: ContentService) {}

    @Query()
    @Allow(contentPermission.Read)
    adminArticles(
        @Ctx() ctx: RequestContext,
        @Args()
        args: {
            options?: {
                skip?: number;
                take?: number;
                filter?: { status?: { eq?: string }; title?: { contains?: string } };
            };
        },
    ) {
        return this.contentService.listForAdmin(ctx, args.options);
    }

    @Query()
    @Allow(contentPermission.Read)
    adminArticle(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.contentService.findById(ctx, id);
    }

    @Mutation()
    @Allow(contentPermission.Create)
    async createContentArticle(@Ctx() ctx: RequestContext, @Args('input') input: ArticleInput) {
        const result = await this.contentService.create(ctx, input);
        return this.toGraphQlResult(result);
    }

    @Mutation()
    @Allow(contentPermission.Update)
    async updateContentArticle(@Ctx() ctx: RequestContext, @Args('id') id: ID, @Args('input') input: Partial<ArticleInput>) {
        const result = await this.contentService.update(ctx, id, input);
        return this.toGraphQlResult(result);
    }

    @Mutation()
    @Allow(contentPermission.Delete)
    deleteContentArticle(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.contentService.delete(ctx, id);
    }

    @Mutation()
    @Allow(contentPermission.Update)
    publishContentArticle(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.contentService.publish(ctx, id);
    }

    @Mutation()
    @Allow(contentPermission.Update)
    unpublishContentArticle(@Ctx() ctx: RequestContext, @Args('id') id: ID) {
        return this.contentService.unpublish(ctx, id);
    }

    @ResolveField('__resolveType')
    @Resolver('CreateContentArticleResult')
    resolveCreateType(value: ContentArticleError | { id: unknown }): string {
        return 'errorCode' in value ? 'ContentArticleError' : 'ContentArticle';
    }

    @ResolveField('__resolveType')
    @Resolver('UpdateContentArticleResult')
    resolveUpdateType(value: ContentArticleError | { id: unknown }): string {
        return 'errorCode' in value ? 'ContentArticleError' : 'ContentArticle';
    }

    private toGraphQlResult(result: ArticleMutationResult) {
        return result.success ? result.article : new ContentArticleError(result.reason);
    }
}
