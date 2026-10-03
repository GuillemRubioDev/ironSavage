/**
 * No se importa en ningún sitio: solo está para que `npm run i18n:extract` añada
 * estos mensajes con id explícito a dashboard/i18n/*.po de este plugin. El dashboard
 * traduce los estados de pedido con los ids `orderState.<Estado>` (ver su
 * useDynamicTranslations), así los estados de almacén (warehouse-order-process.ts)
 * tienen su etiqueta en todas partes: lista de pedidos, ficha, acciones «Pasar a…»,
 * tablas de pedidos del cliente…
 *
 * Los mensajes con id explícito no tienen texto original en inglés, así que en.po
 * también debe llevar un msgstr en inglés para cada uno.
 */
export const WAREHOUSE_ORDER_STATE_IDS = [
    /* i18n*/ 'orderState.InPreparation',
    /* i18n*/ 'orderState.ReadyToShip',
    // Sustituye el «Pago liquidado» de Vendure para que el dashboard use el mismo
    // texto que ve el cliente en la tienda («Pago confirmado»).
    /* i18n*/ 'orderState.PaymentSettled',
];
