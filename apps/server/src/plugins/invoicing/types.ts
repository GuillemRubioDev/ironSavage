export interface InvoicingPluginOptions {
    /** Nombre legal que aparece en la cabecera de la factura. */
    storeName?: string;
    /**
     * Identificación fiscal de la tienda (NIF/CIF). Texto libre: este plugin no valida
     * formatos de ningún país; ver el comentario del plugin para lo que aún debe
     * revisar la gestoría.
     */
    storeTaxId?: string;
    /** Dirección postal en texto libre; se imprime tal cual (una o varias líneas). */
    storeAddress?: string;
    storeEmail?: string;
    storePhone?: string;
    /**
     * Datos del Registro Mercantil (p. ej. "Inscrita en el Registro Mercantil de Madrid, Tomo X, Folio Y, Hoja M-Z").
     * Obligatorios en las facturas de una sociedad; vacío si es autónomo.
     */
    storeRegistry?: string;
    /**
     * Registra cada factura emitida en un sistema fiscal (Veri*Factu en España). Sin
     * configurar, las facturas se emiten sin registro. Ver FiscalRegistrationProvider.
     */
    fiscalRegistration?: FiscalRegistrationProvider;
    /** Carpeta donde se escriben los PDF. Por defecto, `<server>/static/invoices`. */
    pdfOutputDir?: string;
}

export interface InvoicingConfig {
    storeName: string;
    storeTaxId: string;
    storeAddress: string;
    storeEmail: string;
    storePhone?: string;
    storeRegistry?: string;
    fiscalRegistration?: FiscalRegistrationProvider;
    pdfOutputDir: string;
}

export interface CustomerSnapshot {
    customerId: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string;
}

export interface AddressSnapshot {
    fullName?: string | null;
    company?: string | null;
    streetLine1?: string | null;
    streetLine2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    countryCode?: string | null;
    country?: string | null;
}

export interface InvoiceLineData {
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
    imagePreview?: string;
}

/** Todo lo que necesita un proveedor de registro fiscal de una factura emitida. */
export interface FiscalInvoiceData {
    type: 'ORDINARY' | 'RECTIFYING';
    /** P. ej. "A-000123" / "R-000004". */
    number: string;
    issueDate: Date;
    issuer: { name: string; taxId: string };
    recipient: { name: string; taxId?: string; countryCode?: string | null };
    currencyCode: string;
    /** En céntimos; negativos en las rectificativas. */
    subtotal: number;
    tax: number;
    total: number;
    /** Desglose de IVA por tipo, en céntimos. */
    taxBreakdown: Array<{ rate: number; base: number; tax: number }>;
    /** Solo rectificativas. */
    rectifies?: { number: string; issueDate: Date; reason: string };
}

/** Lo que devuelve un proveedor al registrar una factura; se imprime en el PDF. */
export interface FiscalRegistrationResult {
    /** Referencia del proveedor o de la AEAT para el registro (p. ej. su «huella» o id de registro). */
    reference?: string;
    /** QR que se imprime en la factura, como PNG en base64 (los proveedores suelen devolverlo ya hecho). */
    qrPngBase64?: string;
    /** Leyenda que se imprime junto al QR, p. ej. "Factura verificable en la sede electrónica de la AEAT" / "VERI*FACTU". */
    legend?: string;
}

/** Se guarda en la factura (Invoice.fiscalRegistration). */
export interface FiscalRegistrationRecord extends FiscalRegistrationResult {
    status: 'REGISTERED' | 'FAILED';
    provider: string;
    registeredAt: string;
    error?: string;
}

/**
 * Enganche para Veri*Factu (o cualquier obligación de registro o factura
 * electrónica). InvoicingPlugin llama a `register` una vez por factura emitida,
 * ordinaria o rectificativa, justo después de guardarla y antes de generar el PDF, e
 * imprime en el PDF el QR y la leyenda que devuelva.
 *
 * Para cumplir con Veri*Factu, impleméntalo con la API de un proveedor homologado
 * (o con desarrollo propio más el certificado de la AEAT y la «declaración
 * responsable» del productor del software) y pásalo en `InvoicingPlugin.init({
 * fiscalRegistration })`. Un fallo nunca impide emitir la factura: queda como
 * FAILED, se anota en el log y el proveedor puede reintentarlo.
 */
export interface FiscalRegistrationProvider {
    /** Nombre corto que se guarda en cada registro, p. ej. "verifactu-acme". */
    readonly name: string;
    register(data: FiscalInvoiceData): Promise<FiscalRegistrationResult>;
}
