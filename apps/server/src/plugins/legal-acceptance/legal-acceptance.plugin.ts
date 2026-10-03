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
 * Prueba de aceptación de las condiciones generales en cada pedido de la tienda:
 * cuándo (hora del servidor) y qué versión de los textos legales. Se guarda en dos
 * campos personalizados de solo lectura del pedido (termsAcceptedAt, termsVersion),
 * visibles en la ficha del pedido en el dashboard. Ver terms-acceptance.ts.
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
