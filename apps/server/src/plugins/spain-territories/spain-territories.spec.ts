import assert from 'node:assert/strict';
import { test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const {
    spanishTerritory,
    SpainTerritoriesTaxZoneStrategy,
    spainTerritoriesShippingChecker,
    OUTSIDE_VAT_ZONE_NAME,
} = require('./spain-territories');

test('Spanish territories are told apart by the postal code province', () => {
    assert.equal(spanishTerritory('ES', '28013'), 'peninsula');
    assert.equal(spanishTerritory('ES', '07001'), 'baleares');
    assert.equal(spanishTerritory('ES', '35001'), 'canarias');
    assert.equal(spanishTerritory('ES', '38400'), 'canarias');
    assert.equal(spanishTerritory('ES', '51001'), 'ceuta');
    assert.equal(spanishTerritory('ES', '52001'), 'melilla');
    assert.equal(spanishTerritory('es', ' 35 001 '), 'canarias', 'case/whitespace tolerant');
    assert.equal(spanishTerritory('ES', undefined), 'peninsula', 'no postal code yet → mainland');
    assert.equal(spanishTerritory('FR', '35000'), null, 'other countries are not Spanish territories');
});

const peninsula = { id: 1, name: 'España (península y Baleares)', members: [{ code: 'ES' }] };
const outside = { id: 2, name: OUTSIDE_VAT_ZONE_NAME, members: [] };
const europe = { id: 3, name: 'Europa', members: [{ code: 'FR' }] };
const channel = { defaultTaxZone: peninsula };
const zoneFor = (address?: object, zones = [peninsula, outside, europe]) =>
    new SpainTerritoriesTaxZoneStrategy().determineTaxZone({}, zones, channel, address ? { code: 'X', shippingAddress: address } : undefined).name;

test('orders to Canarias, Ceuta and Melilla use the zone outside the VAT area', () => {
    assert.equal(zoneFor({ countryCode: 'ES', postalCode: '35001' }), OUTSIDE_VAT_ZONE_NAME);
    assert.equal(zoneFor({ countryCode: 'ES', postalCode: '51001' }), OUTSIDE_VAT_ZONE_NAME);
    assert.equal(zoneFor({ countryCode: 'ES', postalCode: '52001' }), OUTSIDE_VAT_ZONE_NAME);
});

test('mainland and Baleares keep Spanish VAT; other countries use their own zone', () => {
    assert.equal(zoneFor({ countryCode: 'ES', postalCode: '28013' }), peninsula.name);
    assert.equal(zoneFor({ countryCode: 'ES', postalCode: '07001' }), peninsula.name);
    assert.equal(zoneFor({ countryCode: 'FR', postalCode: '75001' }), 'Europa');
});

test('without a shipping address, or without the special zone, the channel default applies', () => {
    assert.equal(zoneFor(undefined), peninsula.name);
    assert.equal(zoneFor({ countryCode: 'ES', postalCode: '35001' }, [peninsula, europe]), peninsula.name);
    assert.equal(zoneFor({ countryCode: 'JP', postalCode: '100' }), peninsula.name);
});

function eligible(args: Record<string, unknown>, postalCode: string, subTotal = 3000, countryCode = 'ES') {
    const argList = Object.entries({ orderMinimum: 0, peninsula: true, baleares: true, canarias: false, ceuta: false, melilla: false, ...args })
        .map(([name, value]) => ({ name, value: String(value) }));
    return spainTerritoriesShippingChecker.check(
        { channel: { pricesIncludeTax: false } },
        { shippingAddress: { countryCode, postalCode }, subTotal, subTotalWithTax: Math.round(subTotal * 1.21) },
        argList,
        { id: 1 },
    );
}

test('shipping checker: only the territories ticked in the Dashboard are eligible', async () => {
    assert.equal(await eligible({}, '28013'), true);
    assert.equal(await eligible({}, '07001'), true);
    assert.equal(await eligible({}, '35001'), false, 'Canarias off by default');
    assert.equal(await eligible({ canarias: true }, '35001'), true);
    assert.equal(await eligible({ baleares: false }, '07001'), false);
    assert.equal(await eligible({}, '75001', 3000, 'FR'), false, 'never outside Spain');
});

test('shipping checker: minimum order amount (e.g. free shipping from 50 €)', async () => {
    assert.equal(await eligible({ orderMinimum: 5000 }, '28013', 4999), false);
    assert.equal(await eligible({ orderMinimum: 5000 }, '28013', 5000), true);
});
