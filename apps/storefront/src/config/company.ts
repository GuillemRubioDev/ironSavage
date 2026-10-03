/**
 * The company's real legal data, used by every legal page and by the basic
 * privacy notice under the registration form. Fill each value in ONCE here —
 * with verified data, never invented — and the highlighted placeholder
 * disappears everywhere it is used. `null` = still unknown.
 */
export const COMPANY: Record<CompanyField, string | null> = {
    /** Razón social (S.L., S.A.…) or the owner's full name if self-employed. */
    legalName: null,
    taxId: null,
    address: null,
    /** Registro Mercantil data (tomo, folio, hoja). Not applicable to self-employed owners. */
    registry: null,
    contactEmail: null,
    /** May be the same as contactEmail. */
    privacyEmail: null,
    phone: null,
    /** Nº RGSEAA / comunicación sanitaria of the food-supplement business, if applicable. */
    healthRegistry: null,
    /** Designated Data Protection Officer, if one has been appointed. */
    dpo: null,
    hostingProvider: null,
    emailProvider: null,
    carriers: null,
    returnsAddress: null,
    deliveryTimes: null,
    /** Who pays for returns after a withdrawal (usually the customer, and it must be stated). */
    returnCosts: null,
    /** Consumer ADR / arbitration body the company adheres to, if any. */
    adrEntity: null,
};

export type CompanyField =
    | 'legalName' | 'taxId' | 'address' | 'registry' | 'contactEmail' | 'privacyEmail' | 'phone'
    | 'healthRegistry' | 'dpo' | 'hostingProvider' | 'emailProvider' | 'carriers' | 'returnsAddress'
    | 'deliveryTimes' | 'returnCosts' | 'adrEntity';

export const COMPANY_PLACEHOLDERS: Record<CompanyField, string> = {
    legalName: '[RAZÓN SOCIAL O NOMBRE DEL TITULAR]',
    taxId: '[NIF/CIF]',
    address: '[DOMICILIO SOCIAL COMPLETO]',
    registry: '[DATOS REGISTRALES — Registro Mercantil, tomo, folio, hoja]',
    contactEmail: '[EMAIL DE ATENCIÓN AL CLIENTE]',
    privacyEmail: '[EMAIL DE PROTECCIÓN DE DATOS]',
    phone: '[TELÉFONO DE CONTACTO]',
    healthRegistry: '[Nº DE REGISTRO SANITARIO (RGSEAA) O COMUNICACIÓN, SI PROCEDE]',
    dpo: '[DELEGADO DE PROTECCIÓN DE DATOS, SI SE HA DESIGNADO]',
    hostingProvider: '[PROVEEDOR DE HOSTING Y PAÍS]',
    emailProvider: '[PROVEEDOR DE ENVÍO DE EMAILS Y PAÍS]',
    carriers: '[EMPRESAS DE TRANSPORTE]',
    returnsAddress: '[DIRECCIÓN PARA DEVOLUCIONES]',
    deliveryTimes: '[PLAZOS DE ENTREGA]',
    returnCosts: '[QUIÉN ASUME EL COSTE DE LA DEVOLUCIÓN]',
    adrEntity: '[ENTIDAD DE RESOLUCIÓN ALTERNATIVA / JUNTA ARBITRAL DE CONSUMO A LA QUE SE ADHIERE, O INDICAR QUE NO SE ADHIERE]',
};

/** The field's real value, or its bracketed placeholder while it is unknown. */
export function companyText(field: CompanyField): string {
    return COMPANY[field] ?? COMPANY_PLACEHOLDERS[field];
}
