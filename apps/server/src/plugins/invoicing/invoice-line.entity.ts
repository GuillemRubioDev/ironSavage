import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Invoice } from './invoice.entity';

/**
 * Una fila por línea del pedido (más una del envío) en el momento de facturar.
 * `productName`/`sku` son copias congeladas, nunca se cruzan con Product/
 * ProductVariant: el producto puede renombrarse, cambiar de precio o borrarse más
 * adelante sin afectar a una factura ya emitida.
 */
@Entity()
export class InvoiceLine extends VendureEntity {
    constructor(input?: DeepPartial<InvoiceLine>) {
        super(input);
    }

    @Index()
    @EntityId()
    invoiceId: ID;

    @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
    @JoinColumn()
    invoice: Invoice;

    @Column()
    productName: string;

    @Column()
    sku: string;

    @Column()
    quantity: number;

    /** En céntimos, sin IVA. */
    @Column()
    unitPrice: number;

    /** Porcentaje, p. ej. 21 para el 21 %. */
    @Column('float')
    taxRate: number;

    /** En céntimos. */
    @Column()
    taxAmount: number;

    /** En céntimos, con IVA: cantidad * unitPrice + taxAmount. */
    @Column()
    lineTotal: number;

    /**
     * Identificador `preview` de la imagen destacada del producto al facturar (el que
     * usa AssetStorageStrategy.readFileToBuffer, NO una URL pública; ver
     * InvoicingService). Es solo decorativo (una miniatura junto a la línea en el
     * PDF), así que, a diferencia de productName/sku, puede quedar desfasado o no
     * apuntar a nada si se borra la imagen: el generador del PDF ya lo tolera.
     */
    @Column({ nullable: true })
    imagePreview?: string;
}
