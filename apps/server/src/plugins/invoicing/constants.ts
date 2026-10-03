export const loggerCtx = 'InvoicingPlugin';

/**
 * Serie de las facturas ordinarias. El esquema (columna `series` más un contador
 * por serie) ya permite añadir más, p. ej. una serie por canal o por año, sin
 * migración de datos. Añadir series es una decisión fiscal, no técnica, así que a
 * propósito no se ha desarrollado (ver el comentario del plugin).
 */
export const DEFAULT_INVOICE_SERIES = 'A';

export const INVOICE_STATUSES = ['ISSUED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * Serie de las facturas rectificativas (art. 15 RD 1619/2012), que se emiten
 * solas al liquidarse un reembolso. La normativa española exige que las
 * rectificativas tengan una serie propia.
 */
export const RECTIFYING_INVOICE_SERIES = 'R';

export const INVOICE_TYPES = ['ORDINARY', 'RECTIFYING'] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];
