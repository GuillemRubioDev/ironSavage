import {
    dummyPaymentHandler,
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
import { TransactionalEmailPlugin } from './plugins/transactional-email/transactional-email.plugin';
import { PosixAssetNamingStrategy } from './posix-asset-naming-strategy';
import { getAssetUrlPrefix, getCorsOrigin, runProductionSafetyChecks } from './production-safety';
import { getAppEnv, includeDummyPaymentHandler } from './app-environment';
import 'dotenv/config';
import path from 'path';

const IS_DEV = getAppEnv() === 'dev';
// PORT wins because hosting platforms inject it into the environment at runtime, and that
// must take precedence over any value baked into the .env file at scaffold time.
const serverPort = +process.env.PORT || +process.env.VENDURE_SERVER_PORT || 3000;

runProductionSafetyChecks(IS_DEV);

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // Vendure's own default (`{origin: true, credentials: true}`) reflects
        // any request Origin while allowing cookies — fine in dev, but in
        // production that would let any website make credentialed requests
        // against a signed-in session. See production-safety.ts.
        cors: {
            origin: getCorsOrigin(IS_DEV),
            credentials: true,
        },
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
        customPermissions: [contentPermission],
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
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
        // The dummy handler is wired up in dev/test, so nothing simulates a
        // successful card payment without a gateway in production. seed.ts
        // only creates a PaymentMethod referencing this handler under the
        // same condition (see environment.ts) — the two must stay in sync,
        // or a seeded PaymentMethod row could reference an unregistered
        // handler. RedsysPlugin registers its own handler via its
        // `configuration` hook below, unconditionally.
        paymentMethodHandlers: includeDummyPaymentHandler() ? [dummyPaymentHandler] : [],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Product: [
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
        ],
    },
    plugins: [
        // Interactive GraphQL IDE for both APIs — dev-only. Auth is still
        // required for anything sensitive, but there's no reason to expose
        // the schema-exploration tooling itself in production.
        ...(IS_DEV ? [GraphiqlPlugin.init()] : []),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            namingStrategy: new PosixAssetNamingStrategy(),
            // In dev, letting Vendure guess this from the request works fine.
            // In production it must be set explicitly via ASSET_URL_PREFIX —
            // see production-safety.ts for why this used to be a hardcoded
            // placeholder domain here.
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
        InvoicingPlugin.init({
            storeName: process.env.INVOICE_STORE_NAME,
            storeTaxId: process.env.INVOICE_STORE_TAX_ID,
            storeAddress: process.env.INVOICE_STORE_ADDRESS,
            storeEmail: process.env.INVOICE_STORE_EMAIL,
            storePhone: process.env.INVOICE_STORE_PHONE,
        }),
        TransactionalEmailPlugin,
        ReviewsPlugin,
        ContentPlugin,
    ],
};
