import { RequestContext, VendureEvent } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';

/**
 * Se emite una sola vez, justo después de crear de verdad una factura nueva (y su
 * PDF en disco); nunca cuando la factura ya existía. Se añadió para los emails
 * automáticos, para tener una señal fiable de «el PDF está listo para adjuntar» en
 * vez de depender del orden respecto al propio listener de InvoicingEventSubscriber.
 * Sirve tanto para facturas ordinarias como rectificativas (ver `invoice.type`).
 *
 * Lleva las líneas y la ruta absoluta del PDF, para que los suscriptores de otros
 * plugins no tengan que inyectar InvoicingService (que el módulo de InvoicingPlugin
 * no exporta): el evento basta por sí solo a cualquier plugin que quiera reaccionar.
 */
export class InvoiceGeneratedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public invoice: Invoice,
        public lines: InvoiceLine[],
        public pdfPath: string,
    ) {
        super();
    }
}
