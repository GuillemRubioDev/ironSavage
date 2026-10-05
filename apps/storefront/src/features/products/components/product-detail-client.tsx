'use client';

import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {ProductGallery} from '@/features/products/components/product-gallery';
import {ProductInfo} from '@/features/products/components/product-info';
import {ProductBadges} from '@/features/products/components/product-badges';
import {discountPercent} from '@/features/pricing/discount-percent';
import {findVariant, initialSelection, selectOption, type Selection} from '@/features/products/variant-selection';
import {galleryFor} from '@/features/products/product-facts';
import {earnsLoyaltyPoints} from '@/features/loyalty/earning-actions';
import type {DetailProduct} from '@/features/products/components/product-detail-types';

interface ProductDetailClientProps {
    product: DetailProduct;
    currencyCode: string;
    /** Categoría principal, encima del nombre. */
    categoryName?: string;
    /** Puntos por euro del programa Iron Rewards (configuración real del servidor). */
    pointsPerEuro: number;
    /** Estrellas y nº de reseñas (los aporta la feature de reseñas desde site/). */
    ratingSlot?: ReactNode;
    /** Desplegables de información (componente de servidor). */
    detailsSlot?: ReactNode;
}

export function ProductDetailClient(props: ProductDetailClientProps) {
    // Con cacheComponents, Next guarda la página que se deja oculta (<Activity>) con su
    // estado y la vuelve a mostrar al pulsar "atrás". Al ocultarse se desmontan los
    // efectos: ahí se cambia la clave para que al volver la selección, la cantidad y la
    // galería empiecen de cero (spec 7.9: la selección no se recuerda).
    const [visit, setVisit] = useState(0);
    useEffect(() => () => setVisit((v) => v + 1), []);
    return <ProductDetailView key={visit} {...props} />;
}

function ProductDetailView({product, currencyCode, categoryName, pointsPerEuro, ratingSlot, detailsSlot}: ProductDetailClientProps) {
    // La selección vive solo aquí (spec 7.9): ni URL ni almacenamiento. Al volver a la
    // ficha empieza de cero, salvo los grupos de una sola opción (7.8).
    const [selection, setSelection] = useState<Selection>(() => initialSelection(product.optionGroups));
    const selectedVariant = useMemo(
        () => findVariant(product.variants, product.optionGroups, selection),
        [product.variants, product.optionGroups, selection],
    );

    // view_item de GA4: una vez por producto, y otra si se elige otra variante.
    const viewedVariantId = selectedVariant?.id;
    useEffect(() => {
        const variant = product.variants.find((v) => v.id === viewedVariantId) ?? product.variants[0];
        if (!variant) return;
        const price = toMajorUnits(variant.priceWithTax);
        trackEvent('view_item', {
            currency: currencyCode,
            value: price,
            items: [{item_id: variant.sku || variant.id, item_name: product.name, item_variant: variant.name, price, quantity: 1}],
        });
    }, [viewedVariantId, product.id, product.name, product.variants, currencyCode]);

    // Los atletas activos no suman puntos: la línea de puntos sale solo cuando el servidor
    // confirma que este cliente los suma (la página es la misma para todos).
    const [earnsPoints, setEarnsPoints] = useState(false);
    useEffect(() => {
        let active = true;
        earnsLoyaltyPoints().then((earns) => active && setEarnsPoints(earns), () => active && setEarnsPoints(true));
        return () => {
            active = false;
        };
    }, []);

    // Al elegir variante se ven todas sus fotos y después las del producto.
    const images = useMemo(() => galleryFor(product.assets, selectedVariant), [product.assets, selectedVariant]);

    return (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="relative lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:self-start">
                <ProductGallery key={selectedVariant?.id ?? 'default'} images={images} productName={product.name} />
                <ProductBadges
                    percent={selectedVariant ? discountPercent(selectedVariant.priceWithTax, selectedVariant.discountedPriceWithTax) : 0}
                    isNew={(product.customFields?.isNew ?? false) || (selectedVariant?.customFields?.isNew ?? false)}
                />
            </div>
            <div className="space-y-8">
                <ProductInfo
                    product={product}
                    currencyCode={currencyCode}
                    categoryName={categoryName}
                    selection={selection}
                    selectedVariant={selectedVariant}
                    onSelect={(groupId, optionId) => setSelection(current => selectOption(product.variants, current, groupId, optionId))}
                    pointsPerEuro={earnsPoints ? pointsPerEuro : 0}
                    ratingSlot={ratingSlot}
                />
                {detailsSlot}
            </div>
        </div>
    );
}
