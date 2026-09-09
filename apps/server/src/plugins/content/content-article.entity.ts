import { Asset, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { ARTICLE_STATUSES, ArticleStatus } from './constants';

@Entity()
export class ContentArticle extends VendureEntity {
    constructor(input?: DeepPartial<ContentArticle>) {
        super(input);
    }

    @Column()
    titleEs: string;

    @Column()
    titleEn: string;

    /** Shared across locales — the storefront's own URL convention for this
     * whole project (see /productos, /carrito, etc.), not a translated slug. */
    @Index({ unique: true })
    @Column()
    slug: string;

    @Column('text')
    excerptEs: string;

    @Column('text')
    excerptEn: string;

    @Column('text')
    contentEs: string;

    @Column('text')
    contentEn: string;

    /**
     * A plain, unidirectional reference to a native Vendure Asset — reuses
     * Vendure's own asset storage/serving (never a DB blob). `onDelete:
     * 'SET NULL'` means deleting the underlying Asset elsewhere in the admin
     * doesn't break the article, just drops its cover image.
     */
    @ManyToOne(() => Asset, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn()
    coverImage?: Asset;

    @EntityId({ nullable: true })
    coverImageId?: ID;

    @Index()
    @Column({ type: 'varchar', enum: ARTICLE_STATUSES, default: 'DRAFT' })
    status: ArticleStatus;

    @Column({ type: 'timestamp', nullable: true })
    publishedAt?: Date;
}
