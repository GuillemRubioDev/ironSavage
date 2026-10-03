/**
 * Datos legales reales de la empresa, usados en todas las páginas legales y en el
 * aviso básico de privacidad bajo el formulario de registro. Rellena cada valor UNA
 * vez aquí, con datos comprobados y nunca inventados, y el marcador resaltado
 * desaparece en todos los sitios donde se usa. `null` = aún desconocido.
 */
export const COMPANY: Record<CompanyField, string | null> = {
    /** Razón social (S.L., S.A.…) o nombre completo del titular si es autónomo. */
    legalName: null,
    taxId: null,
    address: null,
    /** Datos del Registro Mercantil (tomo, folio, hoja). No aplica a autónomos. */
    registry: null,
    contactEmail: null,
    /** Puede ser el mismo que contactEmail. */
    privacyEmail: null,
    phone: null,
    /** Nº RGSEAA / comunicación sanitaria de la actividad de complementos alimenticios, si aplica. */
    healthRegistry: null,
    /** Delegado de Protección de Datos, si se ha nombrado. */
    dpo: null,
    hostingProvider: null,
    emailProvider: null,
    carriers: null,
    returnsAddress: null,
    deliveryTimes: null,
    /** Quién paga la devolución tras un desistimiento (normalmente el cliente, y debe indicarse). */
    returnCosts: null,
    /** Sistema de resolución alternativa de conflictos / junta arbitral de consumo al que se adhiere la empresa, si lo hay. */
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

/** El valor real del campo, o su marcador entre corchetes mientras se desconoce. */
export function companyText(field: CompanyField): string {
    return COMPANY[field] ?? COMPANY_PLACEHOLDERS[field];
}
