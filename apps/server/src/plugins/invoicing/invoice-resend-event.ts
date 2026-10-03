import { RequestContext, VendureEvent } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';

/**
 * Se emite cuando un administrador pide reenviar una factura ya generada desde la
 * ficha del pedido en el dashboard, normalmente a otra dirección (el cliente la
 * pidió en otro email). Tiene la misma forma que InvoiceGeneratedEvent (por el
 * mismo motivo: lleva todo lo que necesita un suscriptor, sin inyectar
 * InvoicingService), más lo único que cambia: a qué dirección enviarla.
 */
export class InvoiceResendRequestedEvent extends VendureEvent {
    constructor(
        public ctx: RequestContext,
        public invoice: Invoice,
        public lines: InvoiceLine[],
        public pdfPath: string,
        public toEmail: string,
    ) {
        super();
    }
}
