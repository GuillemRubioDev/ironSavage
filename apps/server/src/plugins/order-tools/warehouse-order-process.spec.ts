import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { defaultOrderProcess, mergeTransitionDefinitions, validateTransitionDefinition } = require('@vendure/core');
const { warehouseOrderProcess } = require('./warehouse-order-process');

// Exactamente lo que hace Vendure con config.orderOptions.process al arrancar.
const transitions = mergeTransitionDefinitions(defaultOrderProcess.transitions, warehouseOrderProcess.transitions);

test('the merged order process is valid (every state reachable, no dangling targets)', () => {
    const result = validateTransitionDefinition(transitions, 'Created');
    assert.equal(result.valid, true, result.error);
});

test('after payment, the next step is preparation — it can no longer jump straight to shipped', () => {
    assert.deepEqual([...transitions.PaymentSettled.to].sort(), ['ArrangingAdditionalPayment', 'Cancelled', 'InPreparation', 'Modifying']);
});

test('preparation → prepared → shipped/delivered', () => {
    assert.ok(transitions.InPreparation.to.includes('ReadyToShip'));
    for (const next of ['Shipped', 'PartiallyShipped', 'Delivered', 'PartiallyDelivered']) {
        assert.ok(transitions.ReadyToShip.to.includes(next), `ReadyToShip → ${next}`);
    }
});

test('warehouse steps can be moved back one step to fix mistakes, and cancelled', () => {
    assert.ok(transitions.InPreparation.to.includes('PaymentSettled'));
    assert.ok(transitions.ReadyToShip.to.includes('InPreparation'));
    assert.ok(transitions.InPreparation.to.includes('Cancelled'));
    assert.ok(transitions.ReadyToShip.to.includes('Cancelled'));
});

test('order modifications can return to the warehouse states, and keep their default targets', () => {
    for (const state of ['Modifying', 'ArrangingAdditionalPayment']) {
        assert.ok(transitions[state].to.includes('InPreparation'), `${state} → InPreparation`);
        assert.ok(transitions[state].to.includes('ReadyToShip'), `${state} → ReadyToShip`);
        assert.ok(transitions[state].to.includes('PaymentSettled'), `${state} keeps PaymentSettled`);
    }
});

test('the rest of the default process is kept (shipped states only gain the way back to ReadyToShip)', () => {
    assert.deepEqual(transitions.ArrangingPayment.to, defaultOrderProcess.transitions.ArrangingPayment.to);
    for (const state of ['PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered']) {
        assert.deepEqual(transitions[state].to, [...defaultOrderProcess.transitions[state].to, 'ReadyToShip'], state);
    }
});

function guardWith(fulfillmentStates: string[]) {
    warehouseOrderProcess.init({ get: () => ({ getEntityOrThrow: async () => ({ fulfillments: fulfillmentStates.map(state => ({ state })) }) }) });
    return (from: string, to: string) => warehouseOrderProcess.onTransitionStart(from, to, { ctx: {}, order: { id: '1' } });
}

test('a shipped order can go back to ReadyToShip only when all its shipments are cancelled', async () => {
    assert.equal(await guardWith(['Cancelled'])('Shipped', 'ReadyToShip'), undefined);
    assert.equal(await guardWith([])('Delivered', 'ReadyToShip'), undefined);
    assert.match(await guardWith(['Shipped'])('Shipped', 'ReadyToShip'), /Cancel the order's shipments/);
    assert.match(await guardWith(['Cancelled', 'Delivered'])('Delivered', 'ReadyToShip'), /Cancel the order's shipments/);
});

test('the guard does not interfere with any other transition', async () => {
    const guard = guardWith(['Shipped']);
    assert.equal(await guard('InPreparation', 'ReadyToShip'), undefined);
    assert.equal(await guard('ReadyToShip', 'Shipped'), undefined);
    assert.equal(await guard('PaymentSettled', 'InPreparation'), undefined);
});
