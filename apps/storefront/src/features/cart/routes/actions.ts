'use server';

import {mutate, VendureHttpError} from '@/platform/vendure/api';
import {RemoveFromCartMutation, AdjustCartItemMutation, ApplyPromotionCodeMutation, RemovePromotionCodeMutation, ReopenStuckOrderMutation} from '@/features/cart/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {updateTag} from 'next/cache';
import {getTranslations} from 'next-intl/server';

export type CartActionResult = {success: true} | {success: false; error: string};

/**
 * Un intento de checkout que no terminó (pago abandonado, intento de Redsys
 * denegado) deja el pedido atascado en ArrangingPayment, y Vendure rechaza entonces
 * cualquier cambio en el carrito con ORDER_MODIFICATION_ERROR. Esto hace lo mismo
 * que add-to-cart.ts en ese caso: reabre el pedido para editarlo y repite la
 * mutación una vez. Cualquier otro error se devuelve tal cual.
 */
async function withStuckOrderRecovery<T extends {__typename: string; errorCode?: string}>(
    attempt: () => Promise<T>,
): Promise<T> {
    const result = await attempt();
    if (result.__typename !== 'Order' && result.errorCode === 'ORDER_MODIFICATION_ERROR') {
        const reopened = await mutate(ReopenStuckOrderMutation, {}, {useAuthToken: true});
        if (reopened.data.transitionOrderToState?.__typename === 'Order') {
            return attempt();
        }
    }
    return result;
}

export async function removeFromCart(lineId: string): Promise<CartActionResult> {
    const currencyCode = await getActiveCurrencyCode();
    const result = await withStuckOrderRecovery(async () => {
        const r = await mutate(RemoveFromCartMutation, {lineId}, {useAuthToken: true, currencyCode});
        return r.data.removeOrderLine;
    });
    updateTag('cart');

    if (result.__typename !== 'Order') {
        return {success: false, error: result.message};
    }
    return {success: true};
}

export async function adjustQuantity(lineId: string, quantity: number): Promise<CartActionResult> {
    const currencyCode = await getActiveCurrencyCode();
    const result = await withStuckOrderRecovery(async () => {
        const r = await mutate(AdjustCartItemMutation, {lineId, quantity}, {useAuthToken: true, currencyCode});
        return r.data.adjustOrderLine;
    });
    updateTag('cart');

    if (result.__typename !== 'Order') {
        return {success: false, error: result.message};
    }
    return {success: true};
}

export async function applyPromotionCode(
    prevState: CartActionResult | undefined,
    formData: FormData,
): Promise<CartActionResult> {
    const code = formData.get('code') as string;
    if (!code) {
        return {success: false, error: ''};
    }

    const t = await getTranslations('Cart');
    const currencyCode = await getActiveCurrencyCode();
    let applyResult;
    try {
        applyResult = await withStuckOrderRecovery(async () => {
            const r = await mutate(ApplyPromotionCodeMutation, {couponCode: code}, {useAuthToken: true, currencyCode});
            return r.data.applyCouponCode;
        });
    } catch (err) {
        if (err instanceof VendureHttpError && err.status === 429) {
            const tErrors = await getTranslations('Errors');
            return {success: false, error: tErrors('tooManyAttempts')};
        }
        throw err;
    }

    if (applyResult.__typename !== 'Order') {
        const errorKey = applyResult.__typename === 'CouponCodeExpiredError'
            ? 'couponExpired'
            : applyResult.__typename === 'CouponCodeLimitError'
                ? 'couponLimitReached'
                : 'couponInvalid';
        return {success: false, error: t(errorKey)};
    }

    updateTag('cart');
    return {success: true};
}

export async function removePromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;

    const currencyCode = await getActiveCurrencyCode();
    await mutate(RemovePromotionCodeMutation, {couponCode: code}, {useAuthToken: true, currencyCode});
    updateTag('cart');
}
