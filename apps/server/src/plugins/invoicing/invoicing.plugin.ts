import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { setInvoicingConfig } from './invoicing-config';
import { InvoicingAdminResolver } from './invoicing-admin.resolver';
import { InvoicingShopResolver } from './invoicing-shop.resolver';
import { InvoicingController } from './invoicing.controller';
import { InvoicingEventSubscriber } from './invoicing-event-subscriber';
import { InvoicingService } from './invoicing.service';
export { InvoiceGeneratedEvent } from './invoice-generated-event';
import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceSequence } from './invoice-sequence.entity';
import type { InvoicingPluginOptions } from './types';

/**
 * Invoice generation: when an Order's payment is settled, generates a
 * sequentially-numbered invoice (with frozen customer/billing/line-item
 * snapshots) and a PDF, downloadable from the admin API. Entirely
 * self-contained — no core Vendure behaviour is modified, and it doesn't
 * touch the Redsys or Loyalty plugins.
 *
 * ## Fiscal scope — read before relying on this for real invoicing
 *
 * This plugin deliberately does NOT implement (left for a later, fiscally
 * reviewed phase):
 * - Veri*Factu / any electronic-invoice submission to tax authorities
 * - Rectifying/credit invoices (facturas rectificativas) for refunds —
 *   a refund today does not adjust or void the original invoice
 * - Multiple concurrent series (e.g. per-channel or per-year numbering) —
 *   the schema supports it (a `series` column + a per-series counter), but
 *   only one series ("A") is ever used right now
 * - A customer tax ID (NIF/CIF) field — Vendure's Customer/Address don't
 *   currently have one in this project, so invoices are issued without it
 * - Annual numbering resets, invoice cancellation/void handling, and any
 *   other Spain-specific invoicing requirement not listed above
 *
 * **Whoever enables this for real sales must have a tax advisor confirm**:
 * whether continuous (non-annual) numbering is acceptable, whether a
 * customer tax ID is legally required for these invoice types, and the
 * requirements above before they're built.
 *
 * ## Setup
 * ```ts
 * InvoicingPlugin.init({
 *   storeName: process.env.INVOICE_STORE_NAME,
 *   storeTaxId: process.env.INVOICE_STORE_TAX_ID,
 *   storeAddress: process.env.INVOICE_STORE_ADDRESS,
 *   storeEmail: process.env.INVOICE_STORE_EMAIL,
 *   storePhone: process.env.INVOICE_STORE_PHONE,
 * })
 * ```
 * PDF download: `GET /invoices/:id/pdf` (admin session, or a signed-in
 * customer who owns the order). The Shop API's `myInvoices` query lists the
 * signed-in customer's own invoices to link to that route from.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [InvoicingController],
    providers: [InvoicingService, InvoicingEventSubscriber],
    entities: [Invoice, InvoiceLine, InvoiceSequence],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [InvoicingAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [InvoicingShopResolver],
    },
    compatibility: '^3.0.0',
})
export class InvoicingPlugin {
    static options: InvoicingPluginOptions = {};

    static init(options: InvoicingPluginOptions): typeof InvoicingPlugin {
        InvoicingPlugin.options = options;
        setInvoicingConfig(options);
        return InvoicingPlugin;
    }
}
