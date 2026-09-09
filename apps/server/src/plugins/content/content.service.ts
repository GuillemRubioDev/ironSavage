import { Injectable } from '@nestjs/common';
import { ID, PaginatedList, RequestContext, TransactionalConnection } from '@vendure/core';

import { ContentArticle } from './content-article.entity';

export interface ArticleInput {
    titleEs: string;
    titleEn: string;
    slug: string;
    excerptEs: string;
    excerptEn: string;
    contentEs: string;
    contentEn: string;
    coverImageId?: ID | null;
}

export type ArticleMutationResult = { success: true; article: ContentArticle } | { success: false; reason: string };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@Injectable()
export class ContentService {
    constructor(private connection: TransactionalConnection) {}

    async create(ctx: RequestContext, input: ArticleInput): Promise<ArticleMutationResult> {
        const validationError = this.validate(input);
        if (validationError) {
            return { success: false, reason: validationError };
        }

        const repo = this.connection.getRepository(ctx, ContentArticle);
        try {
            const article = await repo.save(
                new ContentArticle({
                    titleEs: input.titleEs.trim(),
                    titleEn: input.titleEn.trim(),
                    slug: input.slug.trim(),
                    excerptEs: input.excerptEs.trim(),
                    excerptEn: input.excerptEn.trim(),
                    contentEs: input.contentEs.trim(),
                    contentEn: input.contentEn.trim(),
                    coverImageId: input.coverImageId ?? undefined,
                    status: 'DRAFT',
                }),
            );
            return { success: true, article };
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                return { success: false, reason: `An article with the slug "${input.slug}" already exists` };
            }
            throw err;
        }
    }

    async update(ctx: RequestContext, id: ID, input: Partial<ArticleInput>): Promise<ArticleMutationResult> {
        const repo = this.connection.getRepository(ctx, ContentArticle);
        const article = await repo.findOne({ where: { id } });
        if (!article) {
            return { success: false, reason: 'Article not found' };
        }

        const merged: ArticleInput = {
            titleEs: input.titleEs ?? article.titleEs,
            titleEn: input.titleEn ?? article.titleEn,
            slug: input.slug ?? article.slug,
            excerptEs: input.excerptEs ?? article.excerptEs,
            excerptEn: input.excerptEn ?? article.excerptEn,
            contentEs: input.contentEs ?? article.contentEs,
            contentEn: input.contentEn ?? article.contentEn,
            coverImageId: input.coverImageId !== undefined ? input.coverImageId : article.coverImageId,
        };
        const validationError = this.validate(merged);
        if (validationError) {
            return { success: false, reason: validationError };
        }

        article.titleEs = merged.titleEs.trim();
        article.titleEn = merged.titleEn.trim();
        article.slug = merged.slug.trim();
        article.excerptEs = merged.excerptEs.trim();
        article.excerptEn = merged.excerptEn.trim();
        article.contentEs = merged.contentEs.trim();
        article.contentEn = merged.contentEn.trim();
        article.coverImageId = merged.coverImageId ?? undefined;

        try {
            const saved = await repo.save(article);
            return { success: true, article: saved };
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                return { success: false, reason: `An article with the slug "${merged.slug}" already exists` };
            }
            throw err;
        }
    }

    async delete(ctx: RequestContext, id: ID): Promise<boolean> {
        const result = await this.connection.getRepository(ctx, ContentArticle).delete(id);
        return !!result.affected;
    }

    async publish(ctx: RequestContext, id: ID): Promise<ContentArticle | null> {
        const repo = this.connection.getRepository(ctx, ContentArticle);
        const article = await repo.findOne({ where: { id } });
        if (!article) {
            return null;
        }
        article.status = 'PUBLISHED';
        // Keep the original publish date across an unpublish/republish cycle —
        // only stamp it the first time an article actually goes live.
        if (!article.publishedAt) {
            article.publishedAt = new Date();
        }
        return repo.save(article);
    }

    async unpublish(ctx: RequestContext, id: ID): Promise<ContentArticle | null> {
        const repo = this.connection.getRepository(ctx, ContentArticle);
        const article = await repo.findOne({ where: { id } });
        if (!article) {
            return null;
        }
        article.status = 'DRAFT';
        return repo.save(article);
    }

    async findById(ctx: RequestContext, id: ID): Promise<ContentArticle | null> {
        return (await this.connection.getRepository(ctx, ContentArticle).findOne({ where: { id }, relations: { coverImage: true } })) ?? null;
    }

    async listForAdmin(
        ctx: RequestContext,
        options?: { skip?: number; take?: number; filter?: { status?: { eq?: string }; title?: { contains?: string } } },
    ): Promise<PaginatedList<ContentArticle>> {
        const qb = this.connection
            .getRepository(ctx, ContentArticle)
            .createQueryBuilder('article')
            .orderBy('article.createdAt', 'DESC')
            .skip(options?.skip ?? 0)
            .take(options?.take ?? 50);

        const status = options?.filter?.status?.eq;
        if (status) {
            qb.andWhere('article.status = :status', { status });
        }
        const title = options?.filter?.title?.contains;
        if (title) {
            qb.andWhere('(article.titleEs ILIKE :title OR article.titleEn ILIKE :title)', { title: `%${title}%` });
        }

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    /** Public: only ever PUBLISHED articles (rule: DRAFT/ARCHIVED never appear in the storefront). */
    async listPublished(ctx: RequestContext, options?: { skip?: number; take?: number }): Promise<PaginatedList<ContentArticle>> {
        const [items, totalItems] = await this.connection.getRepository(ctx, ContentArticle).findAndCount({
            where: { status: 'PUBLISHED' },
            relations: { coverImage: true },
            order: { publishedAt: 'DESC' },
            skip: options?.skip ?? 0,
            take: options?.take ?? 20,
        });
        return { items, totalItems };
    }

    /** Public: returns null for anything not PUBLISHED, including a DRAFT/ARCHIVED article at a guessed slug. */
    async findPublishedBySlug(ctx: RequestContext, slug: string): Promise<ContentArticle | null> {
        const article = await this.connection
            .getRepository(ctx, ContentArticle)
            .findOne({ where: { slug, status: 'PUBLISHED' }, relations: { coverImage: true } });
        return article ?? null;
    }

    private validate(input: ArticleInput): string | null {
        if (!input.titleEs?.trim() || !input.titleEn?.trim()) {
            return 'Title (Spanish and English) is required';
        }
        if (!input.slug?.trim() || !SLUG_PATTERN.test(input.slug.trim())) {
            return 'Slug is required and must be lowercase letters, numbers and hyphens only';
        }
        if (!input.excerptEs?.trim() || !input.excerptEn?.trim()) {
            return 'Excerpt (Spanish and English) is required';
        }
        if (!input.contentEs?.trim() || !input.contentEn?.trim()) {
            return 'Content (Spanish and English) is required';
        }
        return null;
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}
