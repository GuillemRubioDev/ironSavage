import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { shopApiExtensions } from './api-extensions';
import { redsysPaymentHandler } from './redsys-payment-method.handler';
import { RedsysOrderCodeStrategy } from './redsys-order-code.strategy';
import { RedsysController } from './redsys.controller';
import { RedsysPaymentAttempt } from './redsys-payment-attempt.entity';
import { RedsysConfirmationTypeResolver, RedsysShopResolver } from './redsys-shop.resolver';
import { RedsysService } from './redsys.service';
import { RedsysTransaction } from './redsys-transaction.entity';

/**
 * Redsys ("TPV Virtual") card payment integration, via the "Conexión por
 * Redirección" method: the customer is redirected to Redsys' own hosted
 * payment page to enter their card, and Redsys notifies this server
 * server-to-server once the payment has been authorized.
 *
 * This plugin is entirely self-contained — the only required change outside
 * of it is adding `RedsysPlugin` to the `plugins` array in vendure-config.ts.
 * It does not modify any core Vendure behaviour.
 *
 * ## Required environment variables
 *
 * - `REDSYS_MERCHANT_CODE` — FUC / merchant code
 * - `REDSYS_TERMINAL` — terminal number
 * - `REDSYS_SECRET_KEY` — the base64 secret key ("clave de firma") for the terminal
 * - `REDSYS_ENVIRONMENT` — `test` or `production`
 * - `REDSYS_NOTIFICATION_URL` — publicly reachable URL Redsys will POST to
 *   (this server's `/payments/redsys/notify`)
 * - `STOREFRONT_URL` — base URL of the storefront, used to build the
 *   UrlOK/UrlKO redirect targets
 *
 * ## Setup
 *
 * 1. Set the environment variables above.
 * 2. In the Admin UI (or via the Admin API), create a PaymentMethod with the
 *    "Redsys (tarjeta bancaria)" handler.
 * 3. In the storefront, call the `createRedsysPaymentForm` Shop API mutation
 *    once the order is ready for payment, and auto-submit the returned
 *    url/signatureVersion/merchantParameters/signature as a POST form.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [RedsysController],
    providers: [RedsysService],
    entities: [RedsysTransaction, RedsysPaymentAttempt],
    configuration: config => {
        config.paymentOptions.paymentMethodHandlers.push(redsysPaymentHandler);
        config.orderOptions.orderCodeStrategy = new RedsysOrderCodeStrategy();
        return config;
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [RedsysShopResolver, RedsysConfirmationTypeResolver],
    },
    compatibility: '^3.0.0',
})
export class RedsysPlugin {}
