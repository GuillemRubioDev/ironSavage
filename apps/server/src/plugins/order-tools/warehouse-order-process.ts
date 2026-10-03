import { Injector, Order, OrderProcess, TransactionalConnection } from '@vendure/core';

let connection: TransactionalConnection | undefined;

/** States from which an order can be sent back to ReadyToShip once its shipments are cancelled. */
const SHIPPED_STATES = ['PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered'];

/**
 * Adds the warehouse steps between "paid" and "shipped" to Vendure's default
 * order process:
 *
 *   PaymentSettled → InPreparation → ReadyToShip → (Partially)Shipped → (Partially)Delivered
 *
 * - InPreparation ("Preparando pedido"): the warehouse is picking/packing it.
 * - ReadyToShip ("Pedido preparado"): packed, waiting for the carrier.
 *
 * Shipping is only offered from ReadyToShip: PaymentSettled no longer jumps
 * straight to Shipped/Delivered, so every order goes through the warehouse
 * steps (the Dashboard's "Fulfill" button follows the allowed transitions).
 * Both steps can be moved back one step to correct a mistake, and an order
 * can be cancelled from either of them (refunds, loyalty points and athlete
 * rewards keep reacting to Cancelled exactly as before).
 *
 * Shipped/Delivered themselves are still driven by fulfillments (Vendure's
 * own rule): create the fulfillment, then mark it shipped/delivered. If a
 * fulfillment was shipped by mistake and gets cancelled, Vendure leaves the
 * order in Shipped with nothing shipped — so a shipped/delivered order may go
 * back to ReadyToShip, but only once none of its fulfillments is active.
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
        // After an order modification Vendure returns the order to one of these
        // states, so the warehouse states must be valid targets too.
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

/** States that still belong on the warehouse's "today's orders" sheet (paid, not shipped yet). */
export const ORDER_STATES_TO_PREPARE = ['PaymentSettled', 'InPreparation', 'ReadyToShip'] as const;
