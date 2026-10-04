import {cacheLife, cacheTag} from 'next/cache';
import {CartIcon} from './cart-icon';
import {query} from '@/platform/vendure/api';
import {GetActiveOrderQuery} from '@/features/cart/graphql';

export async function NavbarCart() {
    'use cache: private';
    cacheLife('minutes');
    cacheTag('cart');
    cacheTag('active-order');

    const orderResult = await query(GetActiveOrderQuery, undefined, {
        useAuthToken: true,
        tags: ['cart'],
    });

    const order = orderResult.data.activeOrder;
    return (
        <CartIcon
            cartItemCount={order?.totalQuantity || 0}
            totalWithTax={order?.totalWithTax || 0}
            currencyCode={order?.currencyCode || 'EUR'}
        />
    );
}
