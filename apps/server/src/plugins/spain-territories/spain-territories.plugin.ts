import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { SpainTerritoriesTaxZoneStrategy, spainTerritoriesShippingChecker } from './spain-territories';

/**
 * Territorios de IVA españoles y envíos según territorio (ver spain-territories.ts).
 * Las zonas, categorías y tipos de impuesto son datos, creados con `npm run seed` y
 * editables en el dashboard:
 *   - "España (península y Baleares)": General 21 %, Reducido 10 %, Superreducido 4 %
 *   - "Canarias, Ceuta y Melilla": 0 % en todas las categorías
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        config.taxOptions.taxZoneStrategy = new SpainTerritoriesTaxZoneStrategy();
        config.shippingOptions.shippingEligibilityCheckers = [
            ...(config.shippingOptions.shippingEligibilityCheckers ?? []),
            spainTerritoriesShippingChecker,
        ];
        return config;
    },
    compatibility: '^3.0.0',
})
export class SpainTerritoriesPlugin {}
