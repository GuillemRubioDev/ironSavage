import { RequestContext, VendureEvent } from '@vendure/core';

import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';

/**
 * Fired once, right after a new Invoice (and its PDF on disk) has actually
 * been created — never on the idempotent "invoice already existed" path.
 * Added for the transactional-email phase so it has a reliable signal for
 * "the PDF is ready to attach", instead of guessing at ordering against
 * InvoicingEventSubscriber's own listener on the same OrderStateTransitionEvent.
 *
 * Carries the invoice lines and the PDF's absolute path directly, rather
 * than requiring subscribers in other plugins to inject InvoicingService
 * (which isn't exported from InvoicingPlugin's module) — keeps this event
 * self-contained for any plugin that wants to react to it.
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
