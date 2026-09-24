import { RequestContext, VendureEvent } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';

/**
 * Fired when an admin explicitly asks to resend an already-generated
 * invoice — from the Dashboard order detail page, typically to an address
 * other than the customer's own (they asked for it at a different email).
 * Mirrors InvoiceGeneratedEvent's shape (same reasoning: carries everything
 * a subscriber needs so it never has to inject InvoicingService), plus the
 * one thing that differs — which address to send it to.
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
