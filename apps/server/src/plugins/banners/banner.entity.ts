import { Asset, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

export const BANNER_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type BannerAlignment = (typeof BANNER_ALIGNMENTS)[number];

/** How the image is laid out relative to the text: full-bleed background
 * behind the text (current/original look), or a fixed half split with the
 * image on one side and the text on the other. */
export const BANNER_IMAGE_LAYOUTS = ['background', 'left', 'right'] as const;
export type BannerImageLayout = (typeof BANNER_IMAGE_LAYOUTS)[number];

/**
 * A single promotional slide in the storefront home carousel (the slides
 * after the fixed brand/hero slide — that one stays hardcoded, tied to the
 * site's own translations). Bilingual (es/en) flat fields rather than
 * Vendure's full Translatable/relation machinery — only 2 locales and a
 * handful of short fields, so that would be more ceremony than the data
 * warrants (same simplicity call as ContentArticle, which is single-locale).
 */
@Entity()
export class Banner extends VendureEntity {
    constructor(input?: DeepPartial<Banner>) {
        super(input);
    }

    @Column()
    titleEs: string;

    @Column()
    titleEn: string;

    @Column({ nullable: true })
    subtitleEs?: string;

    @Column({ nullable: true })
    subtitleEn?: string;

    @Column()
    ctaLabelEs: string;

    @Column()
    ctaLabelEn: string;

    /** Destination path, e.g. /categorias/creatina-y-aminoacidos — not validated against the catalog, same as the storefront's previous static config. */
    @Column()
    href: string;

    /**
     * A plain, unidirectional reference to a native Vendure Asset — reuses
     * Vendure's own asset storage/serving. Nullable: the storefront falls
     * back to a brand-gradient background when unset (same behaviour as the
     * static config it replaces). `onDelete: 'SET NULL'` means deleting the
     * Asset elsewhere in the admin doesn't break the banner, just drops its image.
     */
    @ManyToOne(() => Asset, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    image?: Asset;

    @EntityId({ nullable: true })
    imageId?: ID;

    @Column({ type: 'varchar', enum: BANNER_ALIGNMENTS, default: 'left' })
    align: BannerAlignment;

    @Column({ type: 'varchar', enum: BANNER_IMAGE_LAYOUTS, default: 'background' })
    imageLayout: BannerImageLayout;

    /** Lower first. Ties broken by id. */
    @Column({ default: 0 })
    position: number;

    @Column({ default: true })
    enabled: boolean;
}
