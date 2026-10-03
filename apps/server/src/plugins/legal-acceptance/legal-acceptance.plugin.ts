import { defaultOrderProcess, PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';

import { LegalAcceptanceShopResolver } from './legal-acceptance.resolver';
import { orderTermsCustomFields, termsAcceptanceOrderProcess } from './terms-acceptance';

const shopApiExtensions = gql`
    extend type Mutation {
        """
        Records that the customer accepted the terms and conditions (version =
        the legal texts' "last updated" date, YYYY-MM-DD) on the active order.
        Required before the order can move to ArrangingPayment.
        """
        acceptTermsForActiveOrder(version: String!): Boolean!
    }
`;

/**
 * Proof of acceptance of the terms and conditions for every storefront
 * order: when (server time) and which version of the legal texts. Stored as
 * two read-only Order custom fields (termsAcceptedAt, termsVersion), shown on
 * the order in the Dashboard. See terms-acceptance.ts.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        config.customFields.Order = [...(config.customFields.Order ?? []), ...orderTermsCustomFields];
        config.orderOptions.process = [...(config.orderOptions.process ?? [defaultOrderProcess]), termsAcceptanceOrderProcess];
        return config;
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [LegalAcceptanceShopResolver],
    },
    compatibility: '^3.0.0',
})
export class LegalAcceptancePlugin {}
