'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {updateTag} from 'next/cache';
import {AddToCartMutation, ReopenStuckOrderMutation} from '@/features/cart/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {mutate} from '@/platform/vendure/api';
import {setAuthToken} from '@/platform/vendure/auth-token';

export async function addToCart(variantId: string, quantity = 1) {
    const locale = await getLocale();
    const currencyCode = await getActiveCurrencyCode();
    const t = await getTranslations({locale, namespace: 'Errors'});

    try {
        const result = await mutate(
            AddToCartMutation,
            {variantId, quantity},
            {useAuthToken: true, currencyCode},
        );

        if (result.token) await setAuthToken(result.token);

        if (result.data.addItemToOrder.__typename === 'Order') {
            updateTag('cart');
            updateTag('active-order');
            return {success: true, order: result.data.addItemToOrder};
        }

        // A previous checkout attempt that never finished (customer abandoned
        // payment mid-flow, or a Redsys attempt that ended up declined) leaves
        // the order stuck in ArrangingPayment — Vendure then refuses any cart
        // edit with ORDER_MODIFICATION_ERROR, trapping the customer with no way
        // to keep shopping. Recover by reopening the order for editing (the
        // standard Vendure pattern for this exact situation) and retrying once.
        // Safe even if a payment notification is genuinely in flight: recording
        // that payment re-transitions the order back to ArrangingPayment itself
        // regardless of what state it's in when the notification arrives.
        if (result.data.addItemToOrder.errorCode === 'ORDER_MODIFICATION_ERROR') {
            const reopened = await mutate(ReopenStuckOrderMutation, {}, {useAuthToken: true});
            if (reopened.data.transitionOrderToState?.__typename === 'Order') {
                const retry = await mutate(
                    AddToCartMutation,
                    {variantId, quantity},
                    {useAuthToken: true, currencyCode},
                );
                if (retry.token) await setAuthToken(retry.token);
                if (retry.data.addItemToOrder.__typename === 'Order') {
                    updateTag('cart');
                    updateTag('active-order');
                    return {success: true, order: retry.data.addItemToOrder};
                }
                return {success: false, error: retry.data.addItemToOrder.message};
            }
        }

        return {success: false, error: result.data.addItemToOrder.message};
    } catch {
        return {success: false, error: t('failedAddToCart')};
    }
}
