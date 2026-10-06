import { LanguageCode, Logger, PaymentMethodHandler } from '@vendure/core';
import { loggerCtx, REDSYS_PAYMENT_HANDLER_CODE } from './constants';

/**
 * Este handler nunca habla con Redsys: cuando se ejecuta, el resultado ya lo ha
 * determinado y verificado criptográficamente RedsysService.handleNotification().
 * Solo existe para registrar ese resultado verificado como un Payment de Vendure.
 *
 * Está protegido para que solo pueda invocarse desde código de servidor de
 * confianza (nuestro webhook de notificación, que usa un RequestContext de
 * administrador creado internamente) y nunca desde la sesión de un cliente en la
 * Shop API; si no, un cliente podría falsificar un pago «Settled» llamando a
 * `addPaymentToOrder` con unos metadatos inventados.
 */
export const redsysPaymentHandler = new PaymentMethodHandler({
    code: REDSYS_PAYMENT_HANDLER_CODE,
    description: [{ languageCode: LanguageCode.en, value: 'Redsys (tarjeta bancaria)' }],
    args: {},
    createPayment: (ctx, order, amount, args, metadata) => {
        if (ctx.apiType !== 'admin') {
            throw new Error(`Redsys payments can only be created internally, not via apiType '${ctx.apiType}'`);
        }

        const state = metadata.approved ? ('Settled' as const) : ('Declined' as const);
        Logger.info(`Recording ${state} Redsys payment for order ${order.code}`, loggerCtx);

        return {
            amount,
            state,
            transactionId: typeof metadata.authorisationCode === 'string' ? metadata.authorisationCode : undefined,
            errorMessage: metadata.approved
                ? undefined
                : metadata.amountMismatch
                  ? `Redsys cobró un importe distinto del total del pedido; revisar a mano y devolver el cobro si procede (${String(metadata.amountMismatch)})`
                  : `Redsys declined the payment (Ds_Response=${String(metadata.responseCode)})`,
            metadata,
        };
    },
    settlePayment: () => ({ success: true }),
});
