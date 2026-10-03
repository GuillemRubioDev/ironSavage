export interface InvoicingPluginOptions {
    /** Legal/trading name shown on the invoice header. */
    storeName?: string;
    /**
     * Store's tax identification number (NIF/CIF in Spain). Left as a free-form
     * string since this plugin doesn't validate any country-specific format —
     * see the plugin doc comment for what still needs fiscal sign-off.
     */
    storeTaxId?: string;
    /** Free-form postal address, printed as-is (one or more lines). */
    storeAddress?: string;
    storeEmail?: string;
    storePhone?: string;
    /**
     * Registro Mercantil data (e.g. "Inscrita en el Registro Mercantil de Madrid, Tomo X, Folio Y, Hoja M-Z").
     * Mandatory on a company's invoices; leave empty for a self-employed owner.
     */
    storeRegistry?: string;
    /**
     * Registers each issued invoice with a fiscal system — Veri*Factu in Spain.
     * Not configured = invoices are issued without registration. See
     * FiscalRegistrationProvider.
     */
    fiscalRegistration?: FiscalRegistrationProvider;
    /** Directory PDFs are written to. Defaults to `<server>/static/invoices`. */
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

/** Everything a fiscal-registration provider needs about one issued invoice. */
export interface FiscalInvoiceData {
    type: 'ORDINARY' | 'RECTIFYING';
    /** e.g. "A-000123" / "R-000004". */
    number: string;
    issueDate: Date;
    issuer: { name: string; taxId: string };
    recipient: { name: string; taxId?: string; countryCode?: string | null };
    currencyCode: string;
    /** Minor units (cents); negative on rectifying invoices. */
    subtotal: number;
    tax: number;
    total: number;
    /** Tax breakdown by rate, minor units. */
    taxBreakdown: Array<{ rate: number; base: number; tax: number }>;
    /** Rectifying invoices only. */
    rectifies?: { number: string; issueDate: Date; reason: string };
}

/** What a provider returns after registering an invoice; printed on the PDF. */
export interface FiscalRegistrationResult {
    /** Provider/AEAT reference for the record (e.g. its "huella" or record id). */
    reference?: string;
    /** QR code to print on the invoice, as a PNG in base64 (providers usually return it ready-made). */
    qrPngBase64?: string;
    /** Legend to print next to the QR, e.g. "Factura verificable en la sede electrónica de la AEAT" / "VERI*FACTU". */
    legend?: string;
}

/** Stored on the invoice (Invoice.fiscalRegistration). */
export interface FiscalRegistrationRecord extends FiscalRegistrationResult {
    status: 'REGISTERED' | 'FAILED';
    provider: string;
    registeredAt: string;
    error?: string;
}

/**
 * Hook for Veri*Factu (or any e-invoicing/registration obligation). The
 * InvoicingPlugin calls `register` once per issued invoice — ordinary or
 * rectifying — right after it is saved and before its PDF is generated, and
 * prints the returned QR and legend on the PDF.
 *
 * To comply with Veri*Factu, implement this with a homologated provider's API
 * (or an own implementation plus the AEAT certificate and the producer's
 * "declaración responsable") and pass it to `InvoicingPlugin.init({
 * fiscalRegistration })`. A failure never blocks issuing the invoice: it is
 * stored as FAILED, logged, and can be retried by the provider.
 */
export interface FiscalRegistrationProvider {
    /** Short name stored on each record, e.g. "verifactu-acme". */
    readonly name: string;
    register(data: FiscalInvoiceData): Promise<FiscalRegistrationResult>;
}
