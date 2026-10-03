import {
    Channel,
    LanguageCode,
    Order,
    RequestContext,
    ShippingEligibilityChecker,
    TaxZoneStrategy,
    Zone,
} from '@vendure/core';

/**
 * Spanish tax/shipping territories. Vendure works with countries, but for
 * VAT Spain is not one territory: the Canary Islands (IGIC), Ceuta and
 * Melilla (IPSI) are outside the VAT area, and Baleares usually has its own
 * shipping rates. They're told apart by the postal code's province prefix.
 */
export type SpanishTerritory = 'peninsula' | 'baleares' | 'canarias' | 'ceuta' | 'melilla';

const PROVINCE_TERRITORY: Record<string, SpanishTerritory> = {
    '07': 'baleares',
    '35': 'canarias', // Las Palmas
    '38': 'canarias', // Santa Cruz de Tenerife
    '51': 'ceuta',
    '52': 'melilla',
};

/** Territory of a Spanish address, or null for any other country. A missing/unknown postal code counts as the peninsula. */
export function spanishTerritory(countryCode?: string | null, postalCode?: string | null): SpanishTerritory | null {
    if ((countryCode ?? '').toUpperCase() !== 'ES') {
        return null;
    }
    const digits = (postalCode ?? '').replace(/\D/g, '');
    return PROVINCE_TERRITORY[digits.slice(0, 2)] ?? 'peninsula';
}

/** Territories outside the Spanish VAT area. */
export const OUTSIDE_VAT_TERRITORIES: SpanishTerritory[] = ['canarias', 'ceuta', 'melilla'];

/**
 * Name of the tax zone for orders shipped to the Canary Islands, Ceuta and
 * Melilla (created by the seed with 0% rates). Matched by name, so it keeps
 * working after an admin edits its rates; renaming it in the Dashboard
 * disables the special treatment (orders then fall back to the default zone).
 */
export const OUTSIDE_VAT_ZONE_NAME = 'Canarias, Ceuta y Melilla';

/**
 * Like Vendure's AddressBasedTaxZoneStrategy, plus the Spanish territories:
 * an order shipped to the Canary Islands, Ceuta or Melilla uses the
 * OUTSIDE_VAT_ZONE_NAME zone (no Spanish VAT — the customer pays IGIC/IPSI on
 * import). Any other order uses the zone containing its shipping country, or
 * the channel's default zone (also used before there is a shipping address,
 * e.g. for catalogue prices).
 */
export class SpainTerritoriesTaxZoneStrategy implements TaxZoneStrategy {
    determineTaxZone(ctx: RequestContext, zones: Zone[], channel: Channel, order?: Order): Zone {
        const address = order?.shippingAddress;
        if (!address?.countryCode) {
            return channel.defaultTaxZone;
        }
        const territory = spanishTerritory(address.countryCode, address.postalCode);
        if (territory && OUTSIDE_VAT_TERRITORIES.includes(territory)) {
            const outside = zones.find(z => z.name === OUTSIDE_VAT_ZONE_NAME);
            if (outside) {
                return outside;
            }
        }
        const byCountry = zones.find(
            z => z.name !== OUTSIDE_VAT_ZONE_NAME && z.members?.some(member => member.code === address.countryCode),
        );
        return byCountry ?? channel.defaultTaxZone;
    }
}

const booleanArg = (es: string, en: string, defaultValue: boolean) => ({
    type: 'boolean' as const,
    defaultValue,
    label: [
        { languageCode: LanguageCode.es, value: es },
        { languageCode: LanguageCode.en, value: en },
    ],
});

/**
 * Shipping-method condition configured from the Dashboard: which Spanish
 * territories the method covers, and an optional minimum order amount. With
 * it, rates are data, not code — e.g. "Envío península" (península only),
 * "Envío Baleares" (Baleares only), "Envío gratis" (península, 0 €, minimum
 * 50 €). Addresses outside Spain are never eligible (the shop only ships to
 * Spain; add a separate method with the default checker to change that).
 */
export const spainTerritoriesShippingChecker = new ShippingEligibilityChecker({
    code: 'spain-territories-checker',
    description: [
        { languageCode: LanguageCode.es, value: 'Territorios de España y pedido mínimo' },
        { languageCode: LanguageCode.en, value: 'Spanish territories and order minimum' },
    ],
    args: {
        orderMinimum: {
            type: 'int',
            defaultValue: 0,
            ui: { component: 'currency-form-input' },
            label: [
                { languageCode: LanguageCode.es, value: 'Pedido mínimo (0 = sin mínimo)' },
                { languageCode: LanguageCode.en, value: 'Minimum order (0 = none)' },
            ],
        },
        peninsula: booleanArg('España peninsular', 'Mainland Spain', true),
        baleares: booleanArg('Islas Baleares', 'Balearic Islands', true),
        canarias: booleanArg('Islas Canarias', 'Canary Islands', false),
        ceuta: booleanArg('Ceuta', 'Ceuta', false),
        melilla: booleanArg('Melilla', 'Melilla', false),
    },
    check: (ctx, order, args) => {
        const territory = spanishTerritory(order.shippingAddress?.countryCode, order.shippingAddress?.postalCode);
        if (!territory || !args[territory]) {
            return false;
        }
        const subtotal = ctx.channel.pricesIncludeTax ? order.subTotalWithTax : order.subTotal;
        return subtotal >= (args.orderMinimum ?? 0);
    },
});
