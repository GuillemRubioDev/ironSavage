import { msg } from '@lingui/core/macro';

/**
 * No se importa en ningún sitio: este archivo solo existe para que
 * `npm run i18n:extract` meta estos mensajes en el dashboard/i18n/*.po de este
 * plugin. Son textos del dashboard (núcleo de Vendure) que vienen sin traducción al
 * español en @vendure/dashboard 3.7.2: como el id del mensaje sale del mismo texto
 * original, nuestra traducción de es.po sustituye a la vacía de Vendure (los
 * catálogos de los plugins se combinan después de los de serie). Quita las entradas
 * cuando Vendure las traduzca.
 */

// Valores de relleno, solo para que los mensajes extraídos tengan exactamente los
// mismos marcadores ({0}, {entityType}…) que los textos originales de Vendure.
const values: string[] = [];
const entityType = '';
const entityIdsLength = 0;

// Mensaje con id explícito: el título de la sección inferior del menú (se traduce
// con i18n.t('Administration'); ver patches/@vendure+dashboard+*.patch).
export const ADMINISTRATION = /* i18n*/ 'Administration';

export const VENDURE_CORE_MESSAGES = [
    msg`The default currency is chosen from this list.`,
    msg`Add more (${values[0]} selected)`,
    msg`File Size`,
    msg`You must first select an available currency to set a default currency`,
    msg`Failed to set shipping method for order: ${values[0]}`,
    msg`Failed to complete draft order: ${values[0]}`,
    msg`Failed to set coupon code for order: ${values[0]}`,
    msg`Failed to remove coupon code from order: ${values[0]}`,
    msg`This field is required`,
    msg`Failed to set customer for order: ${values[0]}`,
    msg`Select Shipping Calculator`,
    msg`Failed to unset billing address for order: ${values[0]}`,
    msg`Failed to update order custom fields: ${values[0]}`,
    msg`Select Shipping Eligibility Checker`,
    msg`You must select at least one available currency`,
    msg`Change selection`,
    msg`Failed to set shipping address for order: ${values[0]}`,
    msg`Select channels to assign ${values[0]} ${entityType} to`,
    msg`Add collection filter`,
    msg`Successfully assigned ${entityIdsLength} ${entityType} to ${values[0]} channels`,
    msg`Select value`,
    msg`Select Payment Handler`,
    msg`Failed to assign ${entityIdsLength} ${entityType} to ${values[0]} of ${values[1]} channels`,
    msg`No checkers found`,
    msg`Failed to remove order line: ${values[0]}`,
    msg`Source File`,
    msg`Failed to update order line: ${values[0]}`,
    msg`Assign ${entityType} to channels`,
    msg`Failed to delete draft order: ${values[0]}`,
    msg`Select Payment Eligibility Checker`,
    msg`Select one or more channels`,
    msg`Select operator`,
    msg`You must select a default currency from the list of available currencies`,
    msg`Loading selected items...`,
    msg`Failed to set billing address for order: ${values[0]}`,
    msg`Failed to set address for order: ${values[0]}`,
    msg`Select a fulfillment handler`,
    msg`Add item to order`,
    msg`Failed to remove option group`,
    msg`Defaults to the default language.`,
    msg`Failed to unset shipping address for order: ${values[0]}`,
    msg`Search...`,
];
