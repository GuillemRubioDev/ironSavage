import { Injectable } from '@nestjs/common';
import { EventBus, ID, PaginatedList, RequestContext, TransactionalConnection } from '@vendure/core';

import { StorefrontCacheEvent } from '../../storefront-cache-event';

import { Banner, BannerAlignment, BANNER_ALIGNMENTS, BannerImageLayout, BANNER_IMAGE_LAYOUTS } from './banner.entity';

export interface BannerInput {
    titleEs: string;
    titleEn: string;
    subtitleEs?: string | null;
    subtitleEn?: string | null;
    ctaLabelEs: string;
    ctaLabelEn: string;
    href: string;
    imageId?: ID | null;
    align?: BannerAlignment;
    imageLayout?: BannerImageLayout;
    position?: number;
    enabled?: boolean;
}

export type BannerMutationResult = { success: true; banner: Banner } | { success: false; reason: string };

@Injectable()
export class BannersService {
    constructor(
        private connection: TransactionalConnection,
        private eventBus: EventBus,
    ) {}

    /** Avisa al storefront para que el carrusel de la portada muestre el cambio al momento. */
    private notifyStorefront(ctx: RequestContext): void {
        void this.eventBus.publish(new StorefrontCacheEvent(ctx, ['banners']));
    }

    async create(ctx: RequestContext, input: BannerInput): Promise<BannerMutationResult> {
        const validationError = this.validate(input);
        if (validationError) {
            return { success: false, reason: validationError };
        }

        const repo = this.connection.getRepository(ctx, Banner);
        const banner = await repo.save(
            new Banner({
                titleEs: input.titleEs.trim(),
                titleEn: input.titleEn.trim(),
                subtitleEs: input.subtitleEs?.trim() || undefined,
                subtitleEn: input.subtitleEn?.trim() || undefined,
                ctaLabelEs: input.ctaLabelEs.trim(),
                ctaLabelEn: input.ctaLabelEn.trim(),
                href: input.href.trim(),
                imageId: input.imageId ?? undefined,
                align: input.align ?? 'left',
                imageLayout: input.imageLayout ?? 'background',
                position: input.position ?? 0,
                enabled: input.enabled ?? true,
            }),
        );
        this.notifyStorefront(ctx);
        return { success: true, banner };
    }

    async update(ctx: RequestContext, id: ID, input: Partial<BannerInput>): Promise<BannerMutationResult> {
        const repo = this.connection.getRepository(ctx, Banner);
        const banner = await repo.findOne({ where: { id } });
        if (!banner) {
            return { success: false, reason: 'Banner not found' };
        }

        const merged: BannerInput = {
            titleEs: input.titleEs ?? banner.titleEs,
            titleEn: input.titleEn ?? banner.titleEn,
            subtitleEs: input.subtitleEs !== undefined ? input.subtitleEs : banner.subtitleEs,
            subtitleEn: input.subtitleEn !== undefined ? input.subtitleEn : banner.subtitleEn,
            ctaLabelEs: input.ctaLabelEs ?? banner.ctaLabelEs,
            ctaLabelEn: input.ctaLabelEn ?? banner.ctaLabelEn,
            href: input.href ?? banner.href,
            imageId: input.imageId !== undefined ? input.imageId : banner.imageId,
            align: input.align ?? banner.align,
            imageLayout: input.imageLayout ?? banner.imageLayout,
            position: input.position !== undefined ? input.position : banner.position,
            enabled: input.enabled !== undefined ? input.enabled : banner.enabled,
        };
        const validationError = this.validate(merged);
        if (validationError) {
            return { success: false, reason: validationError };
        }

        banner.titleEs = merged.titleEs.trim();
        banner.titleEn = merged.titleEn.trim();
        banner.subtitleEs = merged.subtitleEs?.trim() || undefined;
        banner.subtitleEn = merged.subtitleEn?.trim() || undefined;
        banner.ctaLabelEs = merged.ctaLabelEs.trim();
        banner.ctaLabelEn = merged.ctaLabelEn.trim();
        banner.href = merged.href.trim();
        banner.imageId = merged.imageId ?? undefined;
        banner.align = merged.align ?? 'left';
        banner.imageLayout = merged.imageLayout ?? 'background';
        banner.position = merged.position ?? 0;
        banner.enabled = merged.enabled ?? true;

        const saved = await repo.save(banner);
        this.notifyStorefront(ctx);
        return { success: true, banner: saved };
    }

    async delete(ctx: RequestContext, id: ID): Promise<boolean> {
        const result = await this.connection.getRepository(ctx, Banner).delete(id);
        this.notifyStorefront(ctx);
        return !!result.affected;
    }

    async findById(ctx: RequestContext, id: ID): Promise<Banner | null> {
        return (await this.connection.getRepository(ctx, Banner).findOne({ where: { id }, relations: { image: true } })) ?? null;
    }

    async listForAdmin(ctx: RequestContext, options?: { skip?: number; take?: number }): Promise<PaginatedList<Banner>> {
        const [items, totalItems] = await this.connection.getRepository(ctx, Banner).findAndCount({
            relations: { image: true },
            order: { position: 'ASC', createdAt: 'ASC' },
            skip: options?.skip ?? 0,
            take: options?.take ?? 50,
        });
        return { items, totalItems };
    }

    /** Público: solo los banners activos, en orden de aparición. */
    async listActive(ctx: RequestContext): Promise<Banner[]> {
        return this.connection.getRepository(ctx, Banner).find({
            where: { enabled: true },
            relations: { image: true },
            order: { position: 'ASC', createdAt: 'ASC' },
        });
    }

    private validate(input: BannerInput): string | null {
        if (!input.titleEs?.trim() || !input.titleEn?.trim()) {
            return 'Title (Spanish and English) is required';
        }
        if (!input.ctaLabelEs?.trim() || !input.ctaLabelEn?.trim()) {
            return 'CTA label (Spanish and English) is required';
        }
        if (!input.href?.trim()) {
            return 'Destination URL is required';
        }
        if (input.align && !BANNER_ALIGNMENTS.includes(input.align)) {
            return `Align must be one of: ${BANNER_ALIGNMENTS.join(', ')}`;
        }
        if (input.imageLayout && !BANNER_IMAGE_LAYOUTS.includes(input.imageLayout)) {
            return `Image layout must be one of: ${BANNER_IMAGE_LAYOUTS.join(', ')}`;
        }
        return null;
    }
}
