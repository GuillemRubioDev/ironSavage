/**
 * Versión de los textos legales = fecha de su última actualización (AAAA-MM-DD).
 * Actualízala cada vez que cambie cualquier página legal: aparece al principio de
 * cada página legal y se guarda en cada pedido cuando el cliente acepta las
 * condiciones antes de pagar (campos personalizados termsAcceptedAt/termsVersion del
 * pedido; ver LegalAcceptancePlugin en el servidor), para que la empresa pueda
 * demostrar qué versión aceptó cada cliente.
 */
export const LEGAL_VERSION = '2026-09-28';
