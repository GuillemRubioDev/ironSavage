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
 * Pago con tarjeta por Redsys («TPV Virtual») con el método «Conexión por
 * Redirección»: el cliente va a la página de pago de Redsys para introducir la
 * tarjeta y Redsys avisa a este servidor (de servidor a servidor) cuando el pago
 * está autorizado.
 *
 * El plugin es totalmente independiente: lo único que hace falta fuera de él es
 * añadir `RedsysPlugin` al array `plugins` de vendure-config.ts. No modifica nada
 * del núcleo de Vendure.
 *
 * ## Variables de entorno obligatorias
 *
 * - `REDSYS_MERCHANT_CODE`: FUC / código de comercio
 * - `REDSYS_TERMINAL`: número de terminal
 * - `REDSYS_SECRET_KEY`: clave de firma del terminal, en base64
 * - `REDSYS_ENVIRONMENT`: `test` o `production`
 * - `REDSYS_NOTIFICATION_URL`: URL pública a la que Redsys hará el POST
 *   (`/payments/redsys/notify` de este servidor)
 * - `STOREFRONT_URL`: URL base del storefront, para construir las redirecciones
 *   UrlOK/UrlKO
 *
 * ## Configuración
 *
 * 1. Define las variables de entorno de arriba.
 * 2. En el dashboard (o con la Admin API), crea un método de pago con el handler
 *    «Redsys (tarjeta bancaria)».
 * 3. En el storefront, llama a la mutación `createRedsysPaymentForm` de la Shop API
 *    cuando el pedido esté listo para pagar y envía automáticamente como formulario
 *    POST los url/signatureVersion/merchantParameters/signature devueltos.
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
