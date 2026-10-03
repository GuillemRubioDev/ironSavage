import { DeepPartial, EntityId, ID, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

import { INVOICE_STATUSES, INVOICE_TYPES, InvoiceStatus, InvoiceType } from './constants';
import { AddressSnapshot, CustomerSnapshot, FiscalRegistrationRecord } from './types';

/**
 * Una factura ordinaria por pedido (lo impone el índice único parcial de abajo),
 * más una rectificativa por cada reembolso liquidado. Los datos del cliente y de la
 * dirección de facturación se guardan como copias JSON congeladas al emitirla: la
 * factura debe seguir siendo correcta aunque luego se edite o fusione el cliente o
 * el pedido, o se renombre o borre la variante.
 */
@Entity()
// Doble seguro junto al contador atómico de InvoiceSequence: aunque alguna vez se
// asignaran dos números a la vez, la propia base de datos impide guardar dos veces
// la misma pareja (serie, número).
@Index('IDX_invoice_series_number', ['series', 'number'], { unique: true })
@Index('IDX_invoice_order_ordinary', ['orderId'], { unique: true, where: `"type" = 'ORDINARY'` })
export class Invoice extends VendureEntity {
    constructor(input?: DeepPartial<Invoice>) {
        super(input);
    }

    @Index()
    @EntityId()
    orderId: ID;

    /** Copia del código del pedido, para mostrarlo y buscar sin cruzar tablas. */
    @Column()
    orderCode: string;

    /** Id simple (sin clave foránea) para comprobar permisos; los datos que se muestran están en CustomerSnapshot (types.ts). */
    @Index()
    @EntityId()
    customerId: ID;

    @Column()
    series: string;

    @Column()
    number: number;

    @Column()
    issueDate: Date;

    @Column('simple-json')
    customerSnapshot: CustomerSnapshot;

    @Column('simple-json')
    billingAddressSnapshot: AddressSnapshot;

    /** Todos los importes son enteros en céntimos, como el tipo Money de Vendure. */
    @Column()
    subtotal: number;

    @Column()
    tax: number;

    @Column()
    total: number;

    @Column({ default: 'EUR' })
    currencyCode: string;

    @Column({ type: 'varchar', enum: INVOICE_STATUSES, default: 'ISSUED' })
    status: InvoiceStatus;

    /** ORDINARY = la factura del pedido; RECTIFYING = una factura rectificativa por un reembolso (importes negativos). */
    @Column({ type: 'varchar', enum: INVOICE_TYPES, default: 'ORDINARY' })
    type: InvoiceType;

    /** Solo rectificativas: la factura que corrigen, con su número y fecha copiados para el documento. */
    @EntityId({ nullable: true })
    rectifiesInvoiceId?: ID | null;

    @Column({ type: 'varchar', nullable: true })
    rectifiedInvoiceNumber?: string | null;

    @Column({ type: 'timestamp', nullable: true })
    rectifiedInvoiceDate?: Date | null;

    /** Solo rectificativas: el reembolso de Vendure que documenta; único, para que cada reembolso tenga exactamente una. */
    @Index({ unique: true })
    @EntityId({ nullable: true })
    refundId?: ID | null;

    /** Solo rectificativas: motivo que se imprime (el del reembolso o uno por defecto). */
    @Column({ type: 'text', nullable: true })
    reason?: string | null;

    /**
     * Resultado de registrar la factura en un sistema fiscal (Veri*Factu) con el
     * FiscalRegistrationProvider configurado; null si no hay ninguno.
     */
    @Column({ type: 'simple-json', nullable: true })
    fiscalRegistration?: FiscalRegistrationRecord | null;

    /** Ruta relativa (dentro de pdfOutputDir) del PDF generado, una vez escrito. */
    @Column({ nullable: true })
    pdfPath?: string;
}
