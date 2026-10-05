'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {query} from '@/platform/vendure/api';
import {GetLastPaidOrderQuery} from '@/features/account/graphql';
import {PAID_ORDER_STATES} from '@/features/account/account-summary';
import {addToCart} from '@/features/products/add-to-cart';

/**
 * "Repetir último pedido": copia al carrito los productos y cantidades del último
 * pedido pagado, línea a línea, con la acción de añadir existente. Omite las variantes
 * agotadas o que ya no se pueden añadir y devuelve sus nombres. No toca el pedido
 * anterior: lo que sigue es una compra nueva con los precios de ahora.
 */
export async function repeatLastOrder(): Promise<{success: true; added: number; skipped: string[]} | {success: false; error: string}> {
    const t = await getTranslations({locale: await getLocale(), namespace: 'Account'});
    try {
        const {data} = await query(GetLastPaidOrderQuery, {states: PAID_ORDER_STATES}, {useAuthToken: true});
        const order = data.activeCustomer?.orders.items[0];
        if (!order) return {success: false, error: t('repeat.noOrder')};

        let added = 0;
        const skipped: string[] = [];
        for (const line of order.lines) {
            if (line.productVariant.stockLevel === 'OUT_OF_STOCK') {
                skipped.push(line.productVariant.name);
                continue;
            }
            const result = await addToCart(line.productVariant.id, line.quantity);
            if (result.success) added += 1;
            else skipped.push(line.productVariant.name);
        }
        return {success: true, added, skipped};
    } catch {
        return {success: false, error: t('repeat.error')};
    }
}
