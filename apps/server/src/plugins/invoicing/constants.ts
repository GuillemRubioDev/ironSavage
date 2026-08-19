export const loggerCtx = 'InvoicingPlugin';

/**
 * The only series in use for now. The schema (a `series` column plus a
 * per-series counter row) already supports adding more later — e.g. a
 * separate series per Channel or per year — without a data migration.
 * Introducing more series is a business/fiscal decision, not a technical
 * one, so it's deliberately not built out yet (see plugin doc comment).
 */
export const DEFAULT_INVOICE_SERIES = 'A';

export const INVOICE_STATUSES = ['ISSUED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
