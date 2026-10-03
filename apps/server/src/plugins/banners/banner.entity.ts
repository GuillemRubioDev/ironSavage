import { Asset, DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

export const BANNER_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type BannerAlignment = (typeof BANNER_ALIGNMENTS)[number];

/** Cómo se coloca la imagen respecto al texto: de fondo a sangre detrás del texto
 * (el aspecto original) o en dos mitades fijas, la imagen a un lado y el texto
 * al otro. */
export const BANNER_IMAGE_LAYOUTS = ['background', 'left', 'right'] as const;
export type BannerImageLayout = (typeof BANNER_IMAGE_LAYOUTS)[number];

/**
 * Una diapositiva promocional del carrusel de la portada (las que van después de
 * la diapositiva fija de marca, que sigue en el código ligada a las traducciones
 * del sitio). Campos planos bilingües (es/en) en vez del sistema completo de
 * traducciones de Vendure: con solo 2 idiomas y unos pocos campos cortos, sería
 * más complicación de la que merecen los datos (misma decisión sencilla que en
 * ContentArticle).
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

    /** Ruta de destino, p. ej. /categorias/creatina-y-aminoacidos. No se valida contra el catálogo, igual que la antigua configuración fija del storefront. */
    @Column()
    href: string;

    /**
     * Referencia simple y unidireccional a un Asset nativo de Vendure: reutiliza el
     * almacenamiento y la entrega de recursos de Vendure. Admite nulo: sin imagen, el
     * storefront usa un fondo degradado de la marca (como la configuración fija que
     * sustituye). `onDelete: 'SET NULL'` hace que borrar el Asset en otra parte del
     * panel no rompa el banner; solo se queda sin imagen.
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

    /** Los menores primero; a igualdad, por id. */
    @Column({ default: 0 })
    position: number;

    @Column({ default: true })
    enabled: boolean;
}
