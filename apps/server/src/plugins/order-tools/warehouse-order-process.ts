import { Injector, Order, OrderProcess, TransactionalConnection } from '@vendure/core';

let connection: TransactionalConnection | undefined;

/** Estados desde los que un pedido puede volver a ReadyToShip una vez cancelados sus envíos. */
const SHIPPED_STATES = ['PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered'];

/**
 * Añade los pasos de almacén entre «pagado» y «enviado» al proceso de pedido por
 * defecto de Vendure:
 *
 *   PaymentSettled → InPreparation → ReadyToShip → (Partially)Shipped → (Partially)Delivered
 *
 * - InPreparation («Preparando pedido»): el almacén lo está preparando y empaquetando.
 * - ReadyToShip («Pedido preparado»): empaquetado, esperando al transportista.
 *
 * El envío solo se ofrece desde ReadyToShip: PaymentSettled ya no salta directamente
 * a Shipped/Delivered, así que todo pedido pasa por los pasos de almacén (el botón
 * «Preparar» del dashboard sigue las transiciones permitidas). Ambos pasos pueden
 * retroceder uno para corregir un error, y el pedido puede cancelarse desde
 * cualquiera de ellos (reembolsos, puntos y recompensas de atletas siguen
 * reaccionando a Cancelled igual que antes).
 *
 * Shipped/Delivered siguen dependiendo de los envíos (fulfillments, regla de
 * Vendure): se crea el envío y luego se marca como enviado/entregado. Si un envío se
 * marcó por error y se cancela, Vendure deja el pedido en Shipped sin nada enviado,
 * así que un pedido enviado/entregado puede volver a ReadyToShip, pero solo cuando
 * ninguno de sus envíos está activo.
 */
export const warehouseOrderProcess: OrderProcess<'InPreparation' | 'ReadyToShip'> = {
    transitions: {
        PaymentSettled: {
            to: ['InPreparation', 'Cancelled', 'Modifying', 'ArrangingAdditionalPayment'],
            mergeStrategy: 'replace',
        },
        InPreparation: {
            to: ['ReadyToShip', 'PaymentSettled', 'Cancelled', 'Modifying'],
        },
        ReadyToShip: {
            to: ['PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered', 'InPreparation', 'Cancelled', 'Modifying'],
        },
        PartiallyShipped: { to: ['ReadyToShip'], mergeStrategy: 'merge' },
        Shipped: { to: ['ReadyToShip'], mergeStrategy: 'merge' },
        PartiallyDelivered: { to: ['ReadyToShip'], mergeStrategy: 'merge' },
        Delivered: { to: ['ReadyToShip'], mergeStrategy: 'merge' },
        // Tras modificar un pedido, Vendure lo devuelve a uno de estos estados, así que
        // los estados de almacén también deben ser destinos válidos.
        Modifying: {
            to: ['InPreparation', 'ReadyToShip'],
            mergeStrategy: 'merge',
        },
        ArrangingAdditionalPayment: {
            to: ['InPreparation', 'ReadyToShip'],
            mergeStrategy: 'merge',
        },
    },

    init(injector: Injector) {
        connection = injector.get(TransactionalConnection);
    },

    async onTransitionStart(fromState, toState, { ctx, order }) {
        if (toState !== 'ReadyToShip' || !SHIPPED_STATES.includes(fromState)) {
            return;
        }
        if (!connection) {
            return 'The order process is not initialised yet';
        }
        const withFulfillments = await connection.getEntityOrThrow(ctx, Order, order.id, { relations: ['fulfillments'] });
        const active = (withFulfillments.fulfillments ?? []).filter(f => f.state !== 'Cancelled');
        if (active.length > 0) {
            return 'Cancel the order\'s shipments (fulfillments) first — an order with active shipments cannot go back to "ReadyToShip"';
        }
    },
};

declare module '@vendure/core/dist/service/helpers/order-state-machine/order-state' {
    interface CustomOrderStates {
        InPreparation: never;
        ReadyToShip: never;
    }
}

/** Estados que siguen apareciendo en la hoja de «pedidos de hoy» del almacén (pagados, aún sin enviar). */
export const ORDER_STATES_TO_PREPARE = ['PaymentSettled', 'InPreparation', 'ReadyToShip'] as const;
