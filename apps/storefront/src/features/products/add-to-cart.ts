'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {updateTag} from 'next/cache';
import {AddToCartMutation, ReopenStuckOrderMutation} from '@/features/cart/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {mutate} from '@/platform/vendure/api';
import {setAuthToken} from '@/platform/vendure/auth-token';
import {serverErrorMessage} from '@/platform/vendure/server-error-message';

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

        // Un intento de checkout que no terminó (el cliente abandonó el pago o un
        // intento de Redsys acabó denegado) deja el pedido atascado en
        // ArrangingPayment, y Vendure rechaza cualquier cambio en el carrito con
        // ORDER_MODIFICATION_ERROR, dejando al cliente sin poder seguir comprando. Se
        // recupera reabriendo el pedido para editarlo (el patrón estándar de Vendure
        // para este caso) y reintentando una vez. Es seguro aunque haya una
        // notificación de pago en camino: al registrar ese pago, el propio pedido vuelve
        // a ArrangingPayment esté en el estado que esté cuando llegue la notificación.
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
                return {success: false, error: await serverErrorMessage(retry.data.addItemToOrder.errorCode, locale)};
            }
        }

        return {success: false, error: await serverErrorMessage(result.data.addItemToOrder.errorCode, locale)};
    } catch {
        return {success: false, error: t('failedAddToCart')};
    }
}
