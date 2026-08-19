'use server';

import {mutate} from '@/platform/vendure/api';
import {RemoveFromCartMutation, AdjustCartItemMutation, ApplyPromotionCodeMutation, RemovePromotionCodeMutation} from '@/features/cart/graphql';
import {getActiveCurrencyCode} from '@/features/currency/currency-server';
import {updateTag} from 'next/cache';

export type CartActionResult = {success: true} | {success: false; error: string};

export async function removeFromCart(lineId: string): Promise<CartActionResult> {
    const currencyCode = await getActiveCurrencyCode();
    const result = await mutate(RemoveFromCartMutation, {lineId}, {useAuthToken: true, currencyCode});
    updateTag('cart');

    if (result.data.removeOrderLine.__typename !== 'Order') {
        return {success: false, error: result.data.removeOrderLine.message};
    }
    return {success: true};
}

export async function adjustQuantity(lineId: string, quantity: number): Promise<CartActionResult> {
    const currencyCode = await getActiveCurrencyCode();
    const result = await mutate(AdjustCartItemMutation, {lineId, quantity}, {useAuthToken: true, currencyCode});
    updateTag('cart');

    if (result.data.adjustOrderLine.__typename !== 'Order') {
        return {success: false, error: result.data.adjustOrderLine.message};
    }
    return {success: true};
}

export async function applyPromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;

    const currencyCode = await getActiveCurrencyCode();
    await mutate(ApplyPromotionCodeMutation, {couponCode: code}, {useAuthToken: true, currencyCode});
    updateTag('cart');
}

export async function removePromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;

    const currencyCode = await getActiveCurrencyCode();
    await mutate(RemovePromotionCodeMutation, {couponCode: code}, {useAuthToken: true, currencyCode});
    updateTag('cart');
}
