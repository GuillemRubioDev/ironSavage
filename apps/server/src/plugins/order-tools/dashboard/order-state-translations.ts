/**
 * Not imported anywhere — only here so `npm run i18n:extract` adds these
 * explicit-id messages to this plugin's dashboard/i18n/*.po. The Dashboard
 * translates order states through `orderState.<State>` ids (see its
 * useDynamicTranslations), so the warehouse states (warehouse-order-process.ts)
 * get proper labels everywhere a state is shown: order list, order detail,
 * the "Transition to …" actions, customer order tables…
 *
 * Explicit-id messages have no English source text, so en.po must carry an
 * English msgstr for each of them too.
 */
export const WAREHOUSE_ORDER_STATE_IDS = [
    /* i18n*/ 'orderState.InPreparation',
    /* i18n*/ 'orderState.ReadyToShip',
    // Overrides Vendure's "Pago liquidado" so the Dashboard uses the same
    // wording the customer sees on the storefront ("Pago confirmado").
    /* i18n*/ 'orderState.PaymentSettled',
];
