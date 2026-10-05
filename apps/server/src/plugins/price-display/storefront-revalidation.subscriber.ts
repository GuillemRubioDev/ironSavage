import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import {
    AssetEvent,
    CollectionEvent,
    CollectionModificationEvent,
    EventBus,
    GlobalSettingsEvent,
    Logger,
    ProductChannelEvent,
    ProductEvent,
    ProductOptionEvent,
    ProductOptionGroupEvent,
    ProductVariantChannelEvent,
    ProductVariantEvent,
    PromotionEvent,
    ShippingMethodEvent,
    StockMovementEvent,
    Type,
    VendureEvent,
} from '@vendure/core';

import { StorefrontCacheEvent, StorefrontCacheTag } from '../../storefront-cache-event';
import { loggerCtx } from './constants';

/** Cambios del catálogo: tocan fichas, listados, destacados y el árbol de categorías. */
const CATALOG_TAGS: StorefrontCacheTag[] = ['products', 'collection', 'collections'];
const CATALOG_EVENTS: Array<Type<VendureEvent>> = [
    ProductEvent,
    ProductVariantEvent,
    ProductChannelEvent,
    ProductVariantChannelEvent,
    // Opciones: el nombre y el color de muestra salen en la ficha.
    ProductOptionEvent,
    ProductOptionGroupEvent,
    CollectionEvent,
    CollectionModificationEvent,
    AssetEvent,
    StockMovementEvent,
    PromotionEvent,
];
/** Agrupa una ráfaga de cambios (p. ej. editar varias variantes) en un solo aviso. */
const DEBOUNCE_MS = 1500;
/**
 * Los listados salen del índice de búsqueda, que el worker actualiza unos segundos
 * después del cambio: un segundo aviso pasado este tiempo evita que la tienda
 * vuelva a guardar en caché el listado antiguo.
 */
const SEARCH_INDEX_FOLLOW_UP_MS = 10_000;

/**
 * El storefront cachea fichas, listados, categorías, banners y noticias. Sin esto,
 * un producto nuevo, un cambio de precio o un banner tardarían horas en verse. Ante
 * cualquier cambio del catálogo (o un StorefrontCacheEvent de banners y noticias)
 * avisa al storefront para invalidar las etiquetas de caché afectadas. Si el
 * storefront no está configurado, solo se registra un aviso: nunca bloquea la
 * operación del administrador.
 */
@Injectable()
export class StorefrontRevalidationSubscriber implements OnApplicationBootstrap, OnModuleDestroy {
    private warnedMissingConfig = false;
    private pendingTags = new Set<StorefrontCacheTag>();
    private timers = new Set<ReturnType<typeof setTimeout>>();
    private debounceTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(private eventBus: EventBus) {}

    onApplicationBootstrap(): void {
        for (const eventType of CATALOG_EVENTS) {
            this.eventBus.ofType(eventType).subscribe(() => this.schedule(CATALOG_TAGS, true));
        }
        this.eventBus.ofType(StorefrontCacheEvent).subscribe(event => this.schedule(event.tags, false));
        // La imagen del panel de acceso vive en los ajustes globales.
        this.eventBus.ofType(GlobalSettingsEvent).subscribe(() => this.schedule(['storefront-settings'], false));
        // Y el pedido mínimo del envío gratis sale de los métodos de envío.
        this.eventBus.ofType(ShippingMethodEvent).subscribe(() => this.schedule(['storefront-settings'], false));
    }

    onModuleDestroy(): void {
        for (const timer of this.timers) clearTimeout(timer);
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
    }

    private schedule(tags: StorefrontCacheTag[], followUp: boolean): void {
        tags.forEach(tag => this.pendingTags.add(tag));
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = undefined;
            const batch = [...this.pendingTags];
            this.pendingTags.clear();
            void this.revalidate(batch);
            if (followUp) {
                const timer = setTimeout(() => {
                    this.timers.delete(timer);
                    void this.revalidate(batch);
                }, SEARCH_INDEX_FOLLOW_UP_MS);
                this.timers.add(timer);
            }
        }, DEBOUNCE_MS);
    }

    private async revalidate(tags: StorefrontCacheTag[]): Promise<void> {
        const secret = process.env.REVALIDATION_SECRET;
        const url = process.env.STOREFRONT_REVALIDATE_URL ?? `${process.env.STOREFRONT_URL ?? ''}/api/revalidate`;
        if (!secret || url === '/api/revalidate') {
            if (!this.warnedMissingConfig) {
                this.warnedMissingConfig = true;
                Logger.warn('REVALIDATION_SECRET or STOREFRONT_URL not set — storefront caches will not refresh automatically.', loggerCtx);
            }
            return;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
                body: JSON.stringify({ tags }),
            });
            if (!response.ok) {
                Logger.warn(`Storefront revalidation responded ${response.status}`, loggerCtx);
            }
        } catch (err) {
            Logger.warn(`Storefront revalidation failed: ${String(err)}`, loggerCtx);
        }
    }
}
