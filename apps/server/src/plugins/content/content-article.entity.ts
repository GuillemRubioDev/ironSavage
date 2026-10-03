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

    /** Común a todos los idiomas: sigue la convención de URLs del storefront en todo
     * el proyecto (ver /productos, /carrito, etc.); no es un slug traducido. */
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
     * Referencia simple y unidireccional a un Asset nativo de Vendure: reutiliza el
     * almacenamiento y la entrega de recursos de Vendure (nunca un blob en la base de
     * datos). `onDelete: 'SET NULL'` hace que borrar el Asset en otra parte del panel
     * no rompa el artículo; solo se queda sin portada.
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
