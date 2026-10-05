import { gql } from 'graphql-tag';

// Ajustes de la tienda que el storefront necesita leer sin sesión. La Shop API de
// Vendure no expone GlobalSettings, así que se publica solo lo necesario.
export const shopApiExtensions = gql`
    type StorefrontSettings {
        "Imagen del panel de marca de las páginas de acceso (login y registro). Null si no hay."
        authPanelImage: Asset
    }

    extend type Query {
        storefrontSettings: StorefrontSettings!
    }
`;
