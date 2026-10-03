import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { SpainTerritoriesTaxZoneStrategy, spainTerritoriesShippingChecker } from './spain-territories';

/**
 * Spanish VAT territories and territory-based shipping (see
 * spain-territories.ts). The zones, tax categories and rates themselves are
 * data, created by `npm run seed` and editable in the Dashboard:
 *   - "España (península y Baleares)": General 21 %, Reducido 10 %, Superreducido 4 %
 *   - "Canarias, Ceuta y Melilla": 0 % for every category
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
