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
 * Territorios fiscales y de envío de España. Vendure trabaja con países, pero a
 * efectos de IVA España no es un único territorio: Canarias (IGIC), Ceuta y Melilla
 * (IPSI) están fuera del ámbito del IVA, y Baleares suele tener tarifas de envío
 * propias. Se distinguen por el prefijo de provincia del código postal.
 */
export type SpanishTerritory = 'peninsula' | 'baleares' | 'canarias' | 'ceuta' | 'melilla';

const PROVINCE_TERRITORY: Record<string, SpanishTerritory> = {
    '07': 'baleares',
    '35': 'canarias', // Las Palmas
    '38': 'canarias', // Santa Cruz de Tenerife
    '51': 'ceuta',
    '52': 'melilla',
};

/** Territorio de una dirección española, o null para cualquier otro país. Sin código postal o con uno desconocido cuenta como península. */
export function spanishTerritory(countryCode?: string | null, postalCode?: string | null): SpanishTerritory | null {
    if ((countryCode ?? '').toUpperCase() !== 'ES') {
        return null;
    }
    const digits = (postalCode ?? '').replace(/\D/g, '');
    return PROVINCE_TERRITORY[digits.slice(0, 2)] ?? 'peninsula';
}

/** Territorios fuera del ámbito del IVA español. */
export const OUTSIDE_VAT_TERRITORIES: SpanishTerritory[] = ['canarias', 'ceuta', 'melilla'];

/**
 * Nombre de la zona fiscal de los pedidos enviados a Canarias, Ceuta y Melilla (la
 * crea el seed con tipos al 0 %). Se busca por nombre, así que sigue funcionando si
 * un administrador cambia sus tipos; renombrarla en el dashboard desactiva el trato
 * especial (los pedidos pasan a usar la zona por defecto).
 */
export const OUTSIDE_VAT_ZONE_NAME = 'Canarias, Ceuta y Melilla';

/**
 * Como AddressBasedTaxZoneStrategy de Vendure, más los territorios españoles: un
 * pedido enviado a Canarias, Ceuta o Melilla usa la zona OUTSIDE_VAT_ZONE_NAME (sin
 * IVA español; el cliente paga IGIC/IPSI en la importación). Cualquier otro pedido
 * usa la zona que contiene su país de envío, o la zona por defecto del canal
 * (también antes de tener dirección de envío, p. ej. en los precios del catálogo).
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
 * Condición de método de envío que se configura desde el dashboard: qué territorios
 * españoles cubre el método y un importe mínimo opcional. Así las tarifas son datos,
 * no código; p. ej. "Envío península" (solo península), "Envío Baleares" (solo
 * Baleares), "Envío gratis" (península, 0 €, mínimo 50 €). Las direcciones fuera de
 * España nunca son válidas (la tienda solo envía a España; para cambiarlo, añade
 * otro método con la condición por defecto).
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
