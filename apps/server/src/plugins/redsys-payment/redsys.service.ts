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

/** Ds_Response 0000-0099 = approved; 0400 = cancellation authorized; 0900 = refund authorized. */
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
     * Builds the signed Ds_MerchantParameters/Ds_Signature that the storefront
     * auto-submits to Redsys. The amount always comes from the Order itself —
     * never from anything the browser sends.
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

        // Redsys rejects a new authorization request that reuses an order number
        // it has already seen ("SIS0051 - Número de pedido repetido"), even if the
        // earlier attempt was declined — so every attempt (including a retry of
        // the same Vendure order after a declined card) gets its own fresh
        // Ds_Merchant_Order, mapped back to the real order via RedsysPaymentAttempt.
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
     * Verifies and processes an incoming Redsys notification (or UrlOK/UrlKO
     * redirect, which carries the same signed payload). Idempotent: a
     * duplicate/retried notification for an order that's already been recorded
     * is a safe no-op.
     *
     * Returns the order code on success so the caller can log/respond, or
     * throws for anything that should NOT be treated as "handled" (invalid
     * signature, unknown order) — callers must not let those crash the process
     * or leak details back to the caller.
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
        // Ds_Order is Redsys' echo of the Ds_Merchant_Order we sent — the
        // per-attempt value from buildPaymentForm(), not the Vendure order code.
        const merchantOrder = params.Ds_Order;
        const responseCode = params.Ds_Response;

        if (!merchantOrder || typeof merchantOrder !== 'string') {
            throw new Error('Notification is missing Ds_Order');
        }
        if (responseCode == null) {
            throw new Error(`Notification for order ${merchantOrder} is missing Ds_Response`);
        }

        // Signature MUST be verified before anything in `params` is trusted.
        const isValid = verifyMerchantParametersSignature(config.secretKey, merchantOrder, merchantParameters, signature);
        if (!isValid) {
            // Deliberately no param values in this log — the signature didn't check out,
            // so nothing in the payload is trustworthy.
            Logger.error(`Rejected Redsys notification with invalid signature for order ${merchantOrder}`, loggerCtx);
            throw new Error('Invalid Redsys signature');
        }

        const approved = isApprovedResponseCode(responseCode);
        const adminCtx = await this.createAdminContext(req);

        // RedsysService constructs its own trusted admin ctx rather than reusing
        // whatever (unauthenticated) RequestContext Vendure's AuthGuard attached
        // to this raw REST request — so it must open its own transaction here
        // rather than relying on the `@Transaction()` decorator, which only
        // attaches to the ctx it can see, not to a freshly-constructed one.
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

            // Idempotency: the unique index on merchantOrder makes this insert
            // atomic — a retried/duplicate notification for the same attempt fails
            // here and is treated as already handled, without a second
            // addPaymentToOrder call. Keyed per-attempt (not per Vendure order) so
            // a genuine retry after a decline — which is a *different* attempt —
            // still gets processed.
            //
            // The row is only inserted once recordPayment() has actually succeeded
            // (see below) — a notification that fails partway through must NOT be
            // marked as processed, or a legitimate Redsys retry would be silently
            // and permanently ignored.
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
                    // Explicitly not persisting `params` wholesale: Redsys' redirect flow never
                    // sends full card data, but we only keep the fields we actually use.
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
                    // Lost a race against a concurrent duplicate that also passed the check
                    // above — the payment was still only recorded once, since recordPayment()
                    // itself is guarded by order state (see below). Nothing more to do.
                    Logger.info(`Redsys notification for attempt ${merchantOrder} (order ${orderCode}) was a concurrent duplicate`, loggerCtx);
                } else {
                    throw err;
                }
            }

            return { orderCode, alreadyProcessed: false };
        });
    }

    /**
     * Throws on failure (rather than swallowing it) so a failed attempt is never
     * marked as processed above — that's what keeps a genuine Redsys retry able
     * to succeed later instead of being permanently ignored as "already handled".
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
            // A declined payment is a normal, expected outcome — Vendure reports it as
            // an ErrorResult even though the (Declined) Payment record is still saved
            // and the order correctly stays in ArrangingPayment so the customer can
            // retry. Only *this* case should be treated as "successfully handled";
            // anything else (wrong order state, missing payment method, etc.) is a
            // real failure and must throw so the notification isn't marked as processed.
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
     * `addPaymentToOrder({method})` expects a PaymentMethod *entity's* code —
     * an admin-chosen identifier, not necessarily REDSYS_PAYMENT_HANDLER_CODE
     * itself — so the entity that actually uses this plugin's handler has to be
     * looked up rather than assumed.
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
     * Redsys notifications arrive server-to-server, with no customer session —
     * so we construct a trusted internal RequestContext for the default channel,
     * the same way the official Vendure payment plugins do for their webhooks.
     * `req` is passed through mainly for consistency/logging; the transaction
     * itself is established separately via `withTransaction()` in the caller.
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
