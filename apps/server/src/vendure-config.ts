import {
    Asset,
    dummyPaymentHandler,
    DefaultGuestCheckoutStrategy,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    LanguageCode,
    VendureConfig,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { RedsysPlugin } from './plugins/redsys-payment/redsys-payment.plugin';
import { LoyaltyPlugin } from './plugins/loyalty/loyalty.plugin';
import { InvoicingPlugin } from './plugins/invoicing/invoicing.plugin';
import { ReviewsPlugin } from './plugins/reviews/reviews.plugin';
import { ContentPlugin, contentPermission } from './plugins/content/content.plugin';
import { DashboardExtrasPlugin } from './plugins/dashboard-extras/dashboard-extras.plugin';
import { BannersPlugin } from './plugins/banners/banners.plugin';
import { StorefrontSettingsPlugin } from './plugins/storefront-settings/storefront-settings.plugin';
import { OrderToolsPlugin } from './plugins/order-tools/order-tools.plugin';
import { LegalAcceptancePlugin } from './plugins/legal-acceptance/legal-acceptance.plugin';
import { productFoodInformationFields, variantFoodInformationFields } from './product-food-information';
import { SpainTerritoriesPlugin } from './plugins/spain-territories/spain-territories.plugin';
import { AthletesPlugin, athletePermission } from './plugins/athletes/athletes.plugin';
import { CustomerAccountsPlugin } from './plugins/customer-accounts/customer-accounts.plugin';
import { bannerPermission } from './plugins/banners/banner.permission';
import { TransactionalEmailPlugin } from './plugins/transactional-email/transactional-email.plugin';
import { PriceDisplayPlugin } from './plugins/price-display/price-display.plugin';
import { PosixAssetNamingStrategy } from './posix-asset-naming-strategy';
import { posixAssetStorageStrategyFactory } from './posix-asset-storage-strategy-factory';
import { getAssetUrlPrefix, getCorsOrigin, runProductionSafetyChecks } from './production-safety';
import { graphqlRateLimitMiddleware } from './plugins/security/graphql-rate-limit.middleware';
import { redsysNotifyRateLimitMiddleware } from './plugins/security/redsys-rate-limit.middleware';
import { getAppEnv, includeDummyPaymentHandler } from './app-environment';
import 'dotenv/config';
import path from 'path';

const IS_DEV = getAppEnv() === 'dev';
// PORT tiene prioridad porque las plataformas de hosting la inyectan en ejecución, y debe
// ganar a cualquier valor que quedara en el .env al generar el proyecto.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;

runProductionSafetyChecks(IS_DEV);

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // El valor por defecto de Vendure (`{origin: true, credentials: true}`)
        // acepta cualquier Origin y permite cookies: vale en desarrollo, pero en
        // producción dejaría a cualquier web hacer peticiones con la sesión
        // iniciada de un usuario. Ver production-safety.ts.
        cors: {
            origin: getCorsOrigin(IS_DEV),
            credentials: true,
        },
        // Estas opciones son útiles en desarrollo, pero por seguridad es mejor
        // desactivarlas en producción.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
        middleware: [
            // Límite de peticiones por mutación en las dos APIs. Los comentarios del
            // plugin de seguridad explican las reglas exactas y por qué se mira el
            // cuerpo GraphQL y no la ruta (las dos APIs pasan todas las operaciones
            // por un único endpoint).
            { route: 'shop-api', handler: graphqlRateLimitMiddleware() },
            { route: 'admin-api', handler: graphqlRateLimitMiddleware() },
            { route: 'payments/redsys/notify', handler: redsysNotifyRateLimitMiddleware() },
        ],
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        // Vendure usa '1y' por defecto: un token filtrado u olvidado seguiría
        // valiendo un año. 30 días es un límite más razonable; además acota el
        // daño ahora que cerrar sesión invalida de verdad la sesión en el
        // servidor (ver auth-token.ts / logout.ts).
        sessionDuration: '30d',
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
          // Vendure lo deja sin definir por defecto. Detrás del proxy Caddy, que
          // termina el TLS, la cookie de sesión debe marcarse Secure fuera de
          // desarrollo para que nunca viaje por HTTP sin cifrar. El trustProxy de
          // arriba ya indica a Express que confíe en las cabeceras X-Forwarded-*
          // del proxy.
          secure: !IS_DEV,
        },
        customPermissions: [contentPermission, bannerPermission, athletePermission],
    },
    dbConnectionOptions: {
        type: 'postgres',
        // La sección «Migraciones» del README.md explica las opciones
        // `synchronize` y `migrations`.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        // El método de pago de pruebas solo se registra en dev/test, para que en
        // producción nada simule un pago con tarjeta correcto sin pasarela. seed.ts
        // solo crea el método de pago que lo usa en las mismas condiciones (ver
        // app-environment.ts): los dos deben ir a la par, o el seed podría crear un
        // método de pago que apunte a un handler no registrado. RedsysPlugin
        // registra el suyo siempre, con su hook `configuration` de abajo.
        paymentMethodHandlers: includeDummyPaymentHandler() ? [dummyPaymentHandler] : [],
    },
    orderOptions: {
        // Solo compran clientes con cuenta y sesión iniciada: sin esto, la Shop API
        // permite asignar un cliente invitado al pedido (setCustomerForOrder) y pagar
        // sin registrarse. El storefront también lo exige (proxy.ts y checkout), pero
        // la garantía real está aquí. El carrito anónimo sigue funcionando y se une al
        // del cliente al iniciar sesión.
        guestCheckoutStrategy: new DefaultGuestCheckoutStrategy({
            allowGuestCheckouts: false,
            allowGuestCheckoutForRegisteredCustomers: false,
        }),
    },
    // Al añadir o cambiar campos personalizados hay que actualizar la base de
    // datos con una migración. Ver la sección «Migraciones» del README.md y
    // docs/database-migrations.md.
    customFields: {
        GlobalSettings: [
            {
                // Imagen del panel de marca de login y registro (la lee el storefront con
                // la consulta pública storefrontSettings del plugin storefront-settings).
                name: 'authPanelImage',
                type: 'relation',
                entity: Asset,
                eager: true,
                nullable: true,
                // Sin public: GlobalSettings no está en la Shop API; la imagen la expone solo
                // la consulta storefrontSettings (plugin storefront-settings).
                label: [
                    { languageCode: LanguageCode.en, value: 'Sign-in panel image' },
                    { languageCode: LanguageCode.es, value: 'Imagen del panel de acceso' },
                ],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Image on the brand panel of the store sign-in and register pages. Empty: dark brand background. Remove it here before deleting the asset.',
                    },
                    {
                        languageCode: LanguageCode.es,
                        value: 'Imagen del panel de marca de las páginas de acceso y registro de la tienda. Vacío: fondo oscuro de marca. Quítala aquí antes de borrar el archivo.',
                    },
                ],
            },
        ],
        Product: [
            {
                name: 'isNew',
                type: 'boolean',
                defaultValue: false,
                nullable: false,
                public: true,
                label: [
                    { languageCode: LanguageCode.en, value: 'New arrival' },
                    { languageCode: LanguageCode.es, value: 'Novedad' },
                ],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Shows a "New" badge on the product card and product page.',
                    },
                    {
                        languageCode: LanguageCode.es,
                        value: 'Muestra el distintivo "Novedad" en la tarjeta y la ficha del producto.',
                    },
                ],
            },
            {
                name: 'visibleInStorefront',
                type: 'boolean',
                defaultValue: true,
                nullable: false,
                public: true,
                label: [
                    { languageCode: LanguageCode.en, value: 'Visible in storefront' },
                    { languageCode: LanguageCode.es, value: 'Visible en la tienda' },
                ],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Independent of "enabled": lets a product stay enabled/manageable while being temporarily hidden from storefront listings.',
                    },
                    {
                        languageCode: LanguageCode.es,
                        value: 'Independiente de "enabled": permite mantener un producto activo/gestionable ocultándolo temporalmente de los listados de la tienda.',
                    },
                ],
            },
            ...productFoodInformationFields,
        ],
        ProductVariant: [
            {
                name: 'isNew',
                type: 'boolean',
                defaultValue: false,
                nullable: false,
                public: true,
                label: [
                    { languageCode: LanguageCode.en, value: 'New variant' },
                    { languageCode: LanguageCode.es, value: 'Novedad (variante)' },
                ],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Marks only this variant (e.g. a new size) as new, without flagging the whole product.',
                    },
                    {
                        languageCode: LanguageCode.es,
                        value: 'Marca solo esta variante (p. ej. un tamaño nuevo) como novedad, sin marcar todo el producto.',
                    },
                ],
            },
            ...variantFoodInformationFields,
        ],
    },
    plugins: [
        // IDE interactivo de GraphQL para las dos APIs, solo en desarrollo. Lo
        // sensible sigue pidiendo autenticación, pero no hay motivo para exponer
        // la herramienta de exploración del esquema en producción.
        ...(IS_DEV ? [GraphiqlPlugin.init()] : []),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            namingStrategy: new PosixAssetNamingStrategy(),
            // namingStrategy no basta en Windows: posix-asset-storage-strategy-factory.ts
            // explica por qué el LocalAssetStorageStrategy por defecto vuelve a
            // meter barras invertidas.
            storageStrategyFactory: posixAssetStorageStrategyFactory,
            // En desarrollo basta con que Vendure lo deduzca de la petición. En
            // producción hay que fijarlo con ASSET_URL_PREFIX; production-safety.ts
            // explica por qué aquí había antes un dominio de ejemplo fijo.
            assetUrlPrefix: getAssetUrlPrefix(IS_DEV),
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
        RedsysPlugin,
        LoyaltyPlugin.init({
            pointsPerEuro: 1,
            pointValueInCents: 1,
            minRedeemablePoints: 100,
            maxDiscountPerOrderCents: 2000,
        }),
        // Anota las recompensas de los atletas en el libro de puntos de LoyaltyPlugin (ver athletes.plugin.ts).
        AthletesPlugin,
        InvoicingPlugin.init({
            storeName: process.env.INVOICE_STORE_NAME,
            storeTaxId: process.env.INVOICE_STORE_TAX_ID,
            storeAddress: process.env.INVOICE_STORE_ADDRESS,
            storeEmail: process.env.INVOICE_STORE_EMAIL,
            storePhone: process.env.INVOICE_STORE_PHONE,
            storeRegistry: process.env.INVOICE_STORE_REGISTRY,
        }),
        TransactionalEmailPlugin,
        PriceDisplayPlugin,
        CustomerAccountsPlugin,
        ReviewsPlugin,
        ContentPlugin,
        DashboardExtrasPlugin,
        BannersPlugin,
        StorefrontSettingsPlugin,
        OrderToolsPlugin,
        // Prueba de aceptación de los términos (cuándo y qué versión) en cada pedido de la tienda.
        LegalAcceptancePlugin,
        // Canarias, Ceuta y Melilla fuera del IVA + métodos de envío por territorio.
        SpainTerritoriesPlugin,
    ],
};
