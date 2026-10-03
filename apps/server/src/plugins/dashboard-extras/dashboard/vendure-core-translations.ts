import { msg } from '@lingui/core/macro';

/**
 * Not imported anywhere — this file only exists so `npm run i18n:extract`
 * puts these messages into this plugin's dashboard/i18n/*.po. They are
 * Dashboard (Vendure core) texts that ship without a Spanish translation in
 * @vendure/dashboard 3.7.2: because the message id is derived from the same
 * source text, our translation in es.po overrides Vendure's empty one (plugin
 * catalogs are merged after the built-in ones). Remove entries once upstream
 * translates them.
 */

// Placeholder values, only there so the extracted messages get exactly the
// same placeholders ({0}, {entityType}...) as Vendure's own source strings.
const values: string[] = [];
const entityType = '';
const entityIdsLength = 0;

// Explicit-id message: the bottom menu section heading (translated through
// i18n.t('Administration'), see patches/@vendure+dashboard+*.patch).
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
