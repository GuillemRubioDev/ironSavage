import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, Logger, ProductVariantEvent, PromotionEvent } from '@vendure/core';

import { loggerCtx } from './constants';

/**
 * El storefront cachea las páginas de producto y listado: sin esto, un descuento
 * nuevo tardaría horas en verse en la ficha aunque el carrito ya lo cobre. Al
 * cambiar una promoción o un precio, avisa al storefront para invalidar las
 * etiquetas de caché de productos. Si el storefront no está configurado, solo
 * se registra un aviso: nunca bloquea la operación del administrador.
 */
@Injectable()
export class StorefrontRevalidationSubscriber implements OnApplicationBootstrap {
    private warnedMissingConfig = false;

    constructor(private eventBus: EventBus) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(PromotionEvent).subscribe(() => {
            void this.revalidateProductTags();
        });
        this.eventBus.ofType(ProductVariantEvent).subscribe(event => {
            if (event.type !== 'updated' || !Array.isArray(event.input)) {
                return;
            }
            const changesPrice = event.input.some(input => typeof input === 'object' && input !== null && 'price' in input);
            if (changesPrice) {
                void this.revalidateProductTags();
            }
        });
    }

    private async revalidateProductTags(): Promise<void> {
        const secret = process.env.REVALIDATION_SECRET;
        const url = process.env.STOREFRONT_REVALIDATE_URL ?? `${process.env.STOREFRONT_URL ?? ''}/api/revalidate`;
        if (!secret || url === '/api/revalidate') {
            if (!this.warnedMissingConfig) {
                this.warnedMissingConfig = true;
                Logger.warn('REVALIDATION_SECRET or STOREFRONT_URL not set — storefront product caches will not refresh automatically.', loggerCtx);
            }
            return;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
                body: JSON.stringify({ tags: ['products', 'collection'] }),
            });
            if (!response.ok) {
                Logger.warn(`Storefront revalidation responded ${response.status}`, loggerCtx);
            }
        } catch (err) {
            Logger.warn(`Storefront revalidation failed: ${String(err)}`, loggerCtx);
        }
    }
}
