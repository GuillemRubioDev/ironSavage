import { gql } from 'graphql-tag';

// Ajustes de la tienda que el storefront necesita leer sin sesión. La Shop API de
// Vendure no expone GlobalSettings, así que se publica solo lo necesario.
export const shopApiExtensions = gql`
    type StorefrontSettings {
        "Imagen del panel de marca de las páginas de acceso (login y registro). Null si no hay."
        authPanelImage: Asset
        "Pedido mínimo del envío gratis (península), o null si no hay un método gratis con mínimo."
        freeShippingThreshold: FreeShippingThreshold
    }

    type FreeShippingThreshold {
        "Importe mínimo, en céntimos."
        amount: Money!
        "true: se compara con el subtotal con IVA; false: con el subtotal sin IVA."
        includesTax: Boolean!
    }

    extend type Query {
        storefrontSettings: StorefrontSettings!
    }
`;
