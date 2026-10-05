import {cacheLife, cacheTag} from 'next/cache';
import {query} from '@/platform/vendure/api';
import {graphql} from '@/platform/vendure/graphql';
import type {FreeShippingThreshold} from '@/features/cart/free-shipping-progress';

// La copia local del esquema aún no conoce storefrontSettings (plugin storefront-settings
// del servidor): el resultado se tipa a mano, como en la imagen del panel de acceso.
const FreeShippingThresholdQuery = graphql(`
    query FreeShippingThreshold {
        storefrontSettings {
            freeShippingThreshold {
                amount
                includesTax
            }
        }
    }
`);

/** Lectura en caché: si la consulta falla lanza el error, y los errores no se cachean. */
async function loadFreeShippingThreshold(): Promise<FreeShippingThreshold | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag('storefront-settings');

    const {data} = await query(FreeShippingThresholdQuery);
    const threshold = (data as unknown as {
        storefrontSettings?: {freeShippingThreshold?: FreeShippingThreshold | null};
    }).storefrontSettings?.freeShippingThreshold;
    return threshold ?? null;
}

/**
 * Pedido mínimo del envío gratis (método de envío de 0 € con mínimo, en el dashboard),
 * o null si no hay o si la consulta falla: entonces el carrito va sin barra.
 */
export async function getFreeShippingThreshold(): Promise<FreeShippingThreshold | null> {
    try {
        return await loadFreeShippingThreshold();
    } catch {
        return null;
    }
}
