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
    /** Directory PDFs are written to. Defaults to `<server>/static/invoices`. */
    pdfOutputDir?: string;
}

export interface InvoicingConfig {
    storeName: string;
    storeTaxId: string;
    storeAddress: string;
    storeEmail: string;
    storePhone?: string;
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
}
