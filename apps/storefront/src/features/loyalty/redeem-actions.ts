'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {updateTag} from 'next/cache';
import {mutate} from '@/platform/vendure/api';
import {CancelLoyaltyRedemptionMutation, RedeemLoyaltyPointsMutation} from '@/features/loyalty/graphql';

const KNOWN_ERRORS = ['BELOW_MINIMUM', 'ALREADY_REDEEMED', 'EXCEEDS_MAX_DISCOUNT', 'EXCEEDS_ORDER_TOTAL', 'INSUFFICIENT_BALANCE', 'NO_CUSTOMER'];

/** Canjea puntos sobre el pedido activo con la mutación del servidor y refresca el carrito. */
export async function redeemPoints(points: number): Promise<{success: true} | {success: false; error: string}> {
    const t = await getTranslations({locale: await getLocale(), namespace: 'Loyalty'});
    try {
        const {data} = await mutate(RedeemLoyaltyPointsMutation, {points}, {useAuthToken: true});
        const result = data.redeemLoyaltyPoints;
        if (result.__typename === 'LoyaltyRedemption') {
            updateTag('cart');
            updateTag('active-order');
            return {success: true};
        }
        const code = KNOWN_ERRORS.includes(result.errorCode) ? result.errorCode : 'generic';
        return {success: false, error: t(`redeem.errors.${code}`)};
    } catch {
        return {success: false, error: t('redeem.errors.generic')};
    }
}

/** Deshace el canje del pedido activo (el servidor devuelve los puntos) y refresca el carrito. */
export async function cancelRedemption(): Promise<{success: boolean}> {
    try {
        const {data} = await mutate(CancelLoyaltyRedemptionMutation, {}, {useAuthToken: true});
        updateTag('cart');
        updateTag('active-order');
        return {success: data.cancelLoyaltyPointsRedemption};
    } catch {
        return {success: false};
    }
}
