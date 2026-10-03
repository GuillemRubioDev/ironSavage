import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
    ChannelService,
    Logger,
    Order,
    OrderService,
    OrderStateTransitionError,
    PaymentMethodService,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';

import { getRedsysConfig, getRedsysRedirectUrl } from './redsys-config';
import {
    REDSYS_CURRENCY_NUMERIC,
    REDSYS_PAYMENT_HANDLER_CODE,
    REDSYS_SIGNATURE_VERSION,
    REDSYS_TRANSACTION_TYPE_AUTHORIZATION,
    loggerCtx,
} from './constants';
import { RedsysPaymentAttempt } from './redsys-payment-attempt.entity';
import { generateRedsysOrderNumber } from './redsys-order-number';
import { RedsysTransaction } from './redsys-transaction.entity';
import {
    decodeMerchantParameters,
    encodeMerchantParameters,
    signMerchantParameters,
    verifyMerchantParametersSignature,
} from './redsys-signature';
import type { RedsysMerchantParameters, RedsysNotificationBody, RedsysResponseParameters } from './types';

export interface RedsysPaymentForm {
    url: string;
    signatureVersion: string;
    merchantParameters: string;
    signature: string;
}

export type BuildPaymentFormResult =
    | { success: true; form: RedsysPaymentForm }
    | { success: false; message: string };

/** Ds_Response 0000-0099 = aprobado; 0400 = anulación autorizada; 0900 = devolución autorizada. */
function isApprovedResponseCode(code: string): boolean {
    const n = Number.parseInt(code, 10);
    return Number.isFinite(n) && ((n >= 0 && n < 100) || n === 400 || n === 900);
}

@Injectable()
export class RedsysService {
    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private channelService: ChannelService,
        private paymentMethodService: PaymentMethodService,
    ) {}

    /**
     * Construye el Ds_MerchantParameters/Ds_Signature firmado que el storefront envía
     * automáticamente a Redsys. El importe sale siempre del propio pedido, nunca de
     * nada que envíe el navegador.
     */
    async buildPaymentForm(ctx: RequestContext, order: Order): Promise<BuildPaymentFormResult> {
        const config = getRedsysConfig();

        if (order.lines.length === 0) {
            return { success: false, message: 'Order has no items' };
        }

        const currencyNumeric = REDSYS_CURRENCY_NUMERIC[order.currencyCode];
        if (!currencyNumeric) {
            return { success: false, message: `Unsupported currency for Redsys: ${order.currencyCode}` };
        }

        // Redsys rechaza una nueva autorización que reutiliza un número de pedido ya
        // visto («SIS0051 - Número de pedido repetido»), aunque el intento anterior se
        // denegara; así que cada intento (incluido un reintento del mismo pedido tras
        // una tarjeta denegada) recibe su propio Ds_Merchant_Order, que se relaciona
        // con el pedido real mediante RedsysPaymentAttempt.
        const merchantOrder = generateRedsysOrderNumber();
        await this.connection
            .getRepository(ctx, RedsysPaymentAttempt)
            .insert({ merchantOrder, orderCode: order.code });

        const params: RedsysMerchantParameters = {
            DS_MERCHANT_AMOUNT: String(order.totalWithTax),
            DS_MERCHANT_ORDER: merchantOrder,
            DS_MERCHANT_MERCHANTCODE: config.merchantCode,
            DS_MERCHANT_CURRENCY: currencyNumeric,
            DS_MERCHANT_TRANSACTIONTYPE: REDSYS_TRANSACTION_TYPE_AUTHORIZATION,
            DS_MERCHANT_TERMINAL: config.terminal,
            DS_MERCHANT_MERCHANTURL: config.notificationUrl,
            DS_MERCHANT_URLOK: `${config.storefrontUrl}/order-confirmation/${order.code}`,
            DS_MERCHANT_URLKO: `${config.storefrontUrl}/checkout?redsys=declined`,
        };

        const merchantParameters = encodeMerchantParameters(params);
        const signature = signMerchantParameters(config.secretKey, merchantOrder, merchantParameters);

        Logger.info(
            `Built Redsys payment form for order ${order.code} (attempt ${merchantOrder}, amount ${order.totalWithTax})`,
            loggerCtx,
        );

        return {
            success: true,
            form: {
                url: getRedsysRedirectUrl(),
                signatureVersion: REDSYS_SIGNATURE_VERSION,
                merchantParameters,
                signature,
            },
        };
    }

    /**
     * Verifica y procesa una notificación de Redsys (o la redirección UrlOK/UrlKO, que
     * trae el mismo contenido firmado). Idempotente: una notificación duplicada o
     * reintentada de un pedido ya registrado no hace nada.
     *
     * Si va bien devuelve el código del pedido para que quien llama lo anote o
     * responda; lanza un error en todo lo que NO debe tratarse como «gestionado»
     * (firma inválida, pedido desconocido). Quien llama no debe dejar que eso tumbe el
     * proceso ni devolver detalles al cliente.
     */
    async handleNotification(
        body: RedsysNotificationBody,
        req: Request,
    ): Promise<{ orderCode: string; alreadyProcessed: boolean }> {
        const { Ds_MerchantParameters: merchantParameters, Ds_Signature: signature } = body;

        if (!merchantParameters || !signature) {
            throw new Error('Missing Ds_MerchantParameters or Ds_Signature');
        }

        const config = getRedsysConfig();
        const params = decodeMerchantParameters(merchantParameters) as RedsysResponseParameters;
        // Ds_Order es el eco de Redsys del Ds_Merchant_Order que enviamos: el valor de
        // cada intento de buildPaymentForm(), no el código del pedido de Vendure.
        const merchantOrder = params.Ds_Order;
        const responseCode = params.Ds_Response;

        if (!merchantOrder || typeof merchantOrder !== 'string') {
            throw new Error('Notification is missing Ds_Order');
        }
        if (responseCode == null) {
            throw new Error(`Notification for order ${merchantOrder} is missing Ds_Response`);
        }

        // La firma DEBE verificarse antes de fiarse de nada de `params`.
        const isValid = verifyMerchantParametersSignature(config.secretKey, merchantOrder, merchantParameters, signature);
        if (!isValid) {
            // A propósito sin valores de los parámetros en el log: la firma no cuadra, así
            // que nada del contenido es de fiar.
            Logger.error(`Rejected Redsys notification with invalid signature for order ${merchantOrder}`, loggerCtx);
            throw new Error('Invalid Redsys signature');
        }

        const approved = isApprovedResponseCode(responseCode);
        const adminCtx = await this.createAdminContext(req);

        // RedsysService crea su propio ctx de administrador de confianza en vez de
        // reutilizar el RequestContext (sin autenticar) que el AuthGuard de Vendure puso
        // en esta petición REST; por eso debe abrir aquí su propia transacción en vez de
        // depender del decorador `@Transaction()`, que solo se engancha al ctx que ve,
        // no a uno recién creado.
        return this.connection.withTransaction(adminCtx, async ctx => {
            const attempt = await this.connection
                .getRepository(ctx, RedsysPaymentAttempt)
                .findOne({ where: { merchantOrder } });
            if (!attempt) {
                Logger.error(`Redsys notification for unknown merchant order ${merchantOrder}`, loggerCtx);
                throw new Error(`No payment attempt found for merchant order ${merchantOrder}`);
            }
            const orderCode = attempt.orderCode;

            const order = await this.orderService.findOneByCode(ctx, orderCode);
            if (!order) {
                Logger.error(`Redsys notification for unknown order ${orderCode}`, loggerCtx);
                throw new Error(`No order found with code ${orderCode}`);
            }

            // Idempotencia: el índice único sobre merchantOrder hace atómica esta
            // inserción; una notificación reintentada o duplicada del mismo intento falla
            // aquí y se trata como ya gestionada, sin una segunda llamada a
            // addPaymentToOrder. La clave es por intento (no por pedido) para que un
            // reintento real tras una denegación, que es un intento *distinto*, se siga
            // procesando.
            //
            // La fila solo se inserta cuando recordPayment() ha ido bien (ver abajo):
            // una notificación que falla a medias NO debe marcarse como procesada, o un
            // reintento legítimo de Redsys se ignoraría en silencio para siempre.
            const repository = this.connection.getRepository(ctx, RedsysTransaction);
            const alreadyExists = await repository.findOne({ where: { merchantOrder } });
            if (alreadyExists) {
                Logger.info(`Ignoring duplicate Redsys notification for attempt ${merchantOrder} (order ${orderCode})`, loggerCtx);
                return { orderCode, alreadyProcessed: true };
            }

            await this.recordPayment(ctx, order, approved, responseCode, params.Ds_AuthorisationCode);

            try {
                await repository.insert({
                    merchantOrder,
                    orderCode,
                    responseCode,
                    approved,
                    authorisationCode: params.Ds_AuthorisationCode,
                    // A propósito no se guarda `params` entero: el flujo de redirección de Redsys
                    // nunca envía datos completos de tarjeta, pero solo guardamos lo que usamos.
                    rawResponse: JSON.stringify({
                        Ds_Order: merchantOrder,
                        Ds_Response: responseCode,
                        Ds_Amount: params.Ds_Amount,
                        Ds_Currency: params.Ds_Currency,
                        Ds_AuthorisationCode: params.Ds_AuthorisationCode,
                        Ds_TransactionType: params.Ds_TransactionType,
                        Ds_SecurePayment: params.Ds_SecurePayment,
                    }),
                });
            } catch (err) {
                if (this.isUniqueViolation(err)) {
                    // Un duplicado simultáneo que también pasó la comprobación de arriba ganó la
                    // carrera; el pago solo se registró una vez porque recordPayment() está
                    // protegido por el estado del pedido (ver abajo). No hay nada más que hacer.
                    Logger.info(`Redsys notification for attempt ${merchantOrder} (order ${orderCode}) was a concurrent duplicate`, loggerCtx);
                } else {
                    throw err;
                }
            }

            return { orderCode, alreadyProcessed: false };
        });
    }

    /**
     * Lanza un error si falla (en vez de tragárselo) para que un intento fallido nunca
     * se marque como procesado arriba: así un reintento real de Redsys puede salir bien
     * después en vez de ignorarse para siempre como «ya gestionado».
     */
    private async recordPayment(
        ctx: RequestContext,
        order: Order,
        approved: boolean,
        responseCode: string,
        authorisationCode: string | undefined,
    ): Promise<void> {
        if (order.state !== 'ArrangingPayment') {
            const transitionResult = await this.orderService.transitionToState(ctx, order.id, 'ArrangingPayment');
            if (transitionResult instanceof OrderStateTransitionError) {
                throw new Error(
                    `Could not transition order ${order.code} to ArrangingPayment: ${transitionResult.message}`,
                );
            }
        }

        const paymentMethodCode = await this.getRedsysPaymentMethodCode(ctx);
        const result = await this.orderService.addPaymentToOrder(ctx, order.id, {
            method: paymentMethodCode,
            metadata: { approved, responseCode, authorisationCode },
        });

        if (!(result instanceof Order)) {
            // Un pago denegado es un resultado normal y esperado: Vendure lo devuelve como
            // ErrorResult aunque el Payment (Declined) se guarda y el pedido sigue en
            // ArrangingPayment para que el cliente reintente. Solo *este* caso debe
            // tratarse como «gestionado correctamente»; cualquier otro (estado del pedido
            // incorrecto, falta el método de pago, etc.) es un fallo real y debe lanzar
            // error para que la notificación no se marque como procesada.
            if (result.__typename !== 'PaymentDeclinedError') {
                throw new Error(`Failed to record Redsys payment for order ${order.code}: ${result.message}`);
            }
        }

        Logger.info(
            `Order ${order.code} payment ${approved ? 'approved' : 'declined'} (Ds_Response=${responseCode})`,
            loggerCtx,
        );
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }

    /**
     * `addPaymentToOrder({method})` espera el código de la *entidad* PaymentMethod, un
     * identificador elegido por el administrador y no necesariamente
     * REDSYS_PAYMENT_HANDLER_CODE, así que hay que buscar la entidad que usa el
     * handler de este plugin en vez de suponerlo.
     */
    private async getRedsysPaymentMethodCode(ctx: RequestContext): Promise<string> {
        const { items } = await this.paymentMethodService.findAll(ctx);
        const method = items.find(m => m.handler.code === REDSYS_PAYMENT_HANDLER_CODE);
        if (!method) {
            throw new Error(
                `No enabled PaymentMethod uses the '${REDSYS_PAYMENT_HANDLER_CODE}' handler for channel ${String(ctx.channelId)}`,
            );
        }
        return method.code;
    }

    /**
     * Las notificaciones de Redsys llegan de servidor a servidor, sin sesión de
     * cliente, así que se crea un RequestContext interno de confianza para el canal
     * por defecto, igual que hacen los plugins de pago oficiales de Vendure en sus
     * webhooks. `req` se pasa sobre todo por coherencia y para el log; la transacción
     * la abre por separado quien llama, con `withTransaction()`.
     */
    private async createAdminContext(req: Request): Promise<RequestContext> {
        const channel = await this.channelService.getDefaultChannel();
        return new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel,
            req,
        });
    }
}
