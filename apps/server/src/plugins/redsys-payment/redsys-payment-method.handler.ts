import { LanguageCode, Logger, PaymentMethodHandler } from '@vendure/core';
import { loggerCtx, REDSYS_PAYMENT_HANDLER_CODE } from './constants';

/**
 * This handler never talks to Redsys itself — by the time it runs, the outcome
 * has already been determined and cryptographically verified by
 * RedsysService.handleNotification(). It only exists to record that verified
 * outcome as a Vendure Payment.
 *
 * Guarded so it can only be invoked from trusted server-side code (our own
 * notification webhook, which runs with an internally-constructed admin
 * RequestContext) — never directly from a customer's Shop API session, which
 * would otherwise let a client fake a "Settled" payment by calling
 * `addPaymentToOrder` with a crafted metadata payload.
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
                : `Redsys declined the payment (Ds_Response=${String(metadata.responseCode)})`,
            metadata,
        };
    },
    settlePayment: () => ({ success: true }),
});
