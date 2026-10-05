'use server';

import {getLocale, getTranslations} from 'next-intl/server';
import {updateTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {GetLastPaidOrderQuery} from '@/features/account/graphql';
import {PAID_ORDER_STATES} from '@/features/account/account-summary';
import {addToCart} from '@/features/products/add-to-cart';
import {GetActiveOrderQuery} from '@/features/cart/graphql';

type RepeatResult =
    | {success: true; added: number; skipped: string[]; partial: string[]}
    | {success: false; error: string};

/**
 * "Repetir último pedido": copia al carrito los productos y cantidades del último
 * pedido pagado, línea a línea, con la acción de añadir existente. Omite las variantes
 * agotadas o que ya no se pueden añadir y devuelve sus nombres. No toca el pedido
 * anterior: lo que sigue es una compra nueva con los precios de ahora.
 *
 * Con poco stock, Vendure añade las unidades que quedan y aun así responde con error
 * (InsufficientStockError): esas líneas se comprueban contra el carrito y cuentan como
 * "añadidas en parte", no como omitidas.
 */
export async function repeatLastOrder(): Promise<RepeatResult> {
    const t = await getTranslations({locale: await getLocale(), namespace: 'Account'});
    try {
        const {data} = await query(GetLastPaidOrderQuery, {states: PAID_ORDER_STATES}, {useAuthToken: true});
        const order = data.activeCustomer?.orders.items[0];
        if (!order) return {success: false, error: t('repeat.noOrder')};

        let added = 0;
        const failed: Array<{id: string; name: string}> = [];
        const skipped: string[] = [];
        for (const line of order.lines) {
            if (line.quantity <= 0) continue;
            if (line.productVariant.stockLevel === 'OUT_OF_STOCK') {
                skipped.push(line.productVariant.name);
                continue;
            }
            const result = await addToCart(line.productVariant.id, line.quantity);
            if (result.success) added += 1;
            else failed.push({id: line.productVariant.id, name: line.productVariant.name});
        }

        const partial: string[] = [];
        if (failed.length) {
            const active = await query(GetActiveOrderQuery, {}, {useAuthToken: true}).catch(() => null);
            const inCart = new Set(active?.data.activeOrder?.lines.map(l => l.productVariant.id) ?? []);
            for (const line of failed) {
                if (inCart.has(line.id)) partial.push(line.name);
                else skipped.push(line.name);
            }
            // addToCart no refresca el carrito cuando responde con error: se hace aquí.
            if (partial.length) {
                updateTag('cart');
                updateTag('active-order');
            }
        }
        return {success: true, added: added + partial.length, skipped, partial};
    } catch {
        return {success: false, error: t('repeat.error')};
    }
}
