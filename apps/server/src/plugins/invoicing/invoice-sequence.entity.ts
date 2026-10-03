import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index } from 'typeorm';

/**
 * Una fila por serie con el último número emitido. Se incrementa con un único
 * `UPDATE ... SET "lastNumber" = "lastNumber" + 1 ... RETURNING` atómico (ver
 * InvoicingService.allocateNextNumber), así el bloqueo de fila de Postgres
 * serializa las facturas simultáneas: sin huecos, sin duplicados y sin carreras de
 * leer y luego escribir, sin necesidad de un bloqueo en la aplicación.
 */
@Entity()
export class InvoiceSequence extends VendureEntity {
    constructor(input?: DeepPartial<InvoiceSequence>) {
        super(input);
    }

    @Index({ unique: true })
    @Column()
    series: string;

    @Column({ default: 0 })
    lastNumber: number;
}
