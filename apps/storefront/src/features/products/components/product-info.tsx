'use client';

import {useState, useTransition, type ReactNode} from 'react';
import {CheckCircle2, Clock, Minus, Plus, RotateCcw, ShieldCheck, ShoppingCart, Star, Truck} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {addToCart} from '@/features/products/add-to-cart';
import {useCartDrawer} from '@/features/cart/cart-drawer';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {Price} from '@/features/pricing/price';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';
import {isOptionAvailable, type Selection} from '@/features/products/variant-selection';
import {pointsFor} from '@/features/products/product-facts';
import type {DetailProduct, DetailVariant} from '@/features/products/components/product-detail-types';
import {OptionSwatch} from '@/features/products/components/option-swatch';

interface ProductInfoProps {
    product: DetailProduct;
    currencyCode: string;
    categoryName?: string;
    selection: Selection;
    selectedVariant: DetailVariant | undefined;
    onSelect: (groupId: string, optionId: string) => void;
    pointsPerEuro: number;
    ratingSlot?: ReactNode;
}

/**
 * Bloque de compra de la ficha: categoría, nombre, reseñas, precio con IVA, opciones
 * (las que no casan con lo elegido salen tachadas pero se pueden pulsar), stock,
 * cantidad, Añadir al carrito, puntos que suma la compra y mini franja de confianza.
 * En móvil, el botón vive en una barra fija abajo.
 */
export function ProductInfo({product, currencyCode, categoryName, selection, selectedVariant, onSelect, pointsPerEuro, ratingSlot}: ProductInfoProps) {
    const t = useTranslations('Product');
    const {open: openCartDrawer} = useCartDrawer();
    const [quantity, setQuantity] = useState(1);
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);

    const isInStock = !!selectedVariant && selectedVariant.stockLevel !== 'OUT_OF_STOCK';
    // La Shop API solo devuelve variantes activas: un producto sin ninguna no tiene precio.
    const minPrice = product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.discountedPriceWithTax)) : null;
    const points = selectedVariant && pointsPerEuro > 0 ? pointsFor(selectedVariant.discountedPriceWithTax, quantity, pointsPerEuro) : 0;

    const handleAddToCart = () => {
        if (!selectedVariant) return;
        startTransition(async () => {
            const result = await addToCart(selectedVariant.id, quantity);
            if (!result.success) {
                toast.error(t('errorTitle'), {description: result.error || t('errorAddToCart')});
                return;
            }
            setIsAdded(true);
            const price = toMajorUnits(selectedVariant.priceWithTax);
            trackEvent('add_to_cart', {
                currency: currencyCode,
                value: price * quantity,
                items: [{item_id: selectedVariant.sku || selectedVariant.id, item_name: product.name, item_variant: selectedVariant.name, price, quantity}],
            });
            // El panel lateral confirma el añadido (y propone el siguiente paso).
            openCartDrawer(product.slug);
            // Quita el estado «añadido» a los 2 segundos.
            setTimeout(() => setIsAdded(false), 2000);
        });
    };

    const buttonLabel = isAdded
        ? t('addedToCart')
        : isPending
            ? t('adding')
            : !selectedVariant
                ? t('selectOptions')
                : !isInStock
                    ? t('outOfStock')
                    : t('addToCart');

    const addButton = (className: string) => (
        <Button size="lg" className={className} disabled={!isInStock || isPending} onClick={handleAddToCart}>
            {isAdded ? <CheckCircle2 aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
            {buttonLabel}
        </Button>
    );

    const price = selectedVariant ? (
        <PriceWithDiscount before={selectedVariant.priceWithTax} after={selectedVariant.discountedPriceWithTax} currencyCode={currencyCode} size="lg" />
    ) : minPrice !== null ? (
        <>
            <span className="mr-1 font-sans text-sm font-normal text-muted-foreground">{t('from')}</span>
            <Price value={minPrice} currencyCode={currencyCode} />
        </>
    ) : null;

    const trust = [
        {icon: Truck, label: t('trustBadges.fastShipping')},
        {icon: ShieldCheck, label: t('trustBadges.secureCheckout')},
        {icon: RotateCcw, label: t('trustBadges.freeReturns')},
        {icon: Clock, label: t('trustBadges.guarantee')},
    ];

    return (
        <>
            <div className="space-y-6">
                <div className="space-y-2">
                    {categoryName && <p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">{categoryName}</p>}
                    <h1 className="text-5xl md:text-6xl">{product.name}</h1>
                    {ratingSlot}
                    <div className="pt-2">
                        <p className="font-mono text-3xl font-semibold">{price}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('taxIncluded')}</p>
                    </div>
                </div>

                {product.optionGroups.map((group) => (
                    <fieldset key={group.id}>
                        <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</legend>
                        <div className="flex flex-wrap gap-2">
                            {group.options.map((option) => {
                                const selected = selection[group.id] === option.id;
                                const available = isOptionAvailable(product.variants, selection, group.id, option.id);
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => onSelect(group.id, option.id)}
                                        className={cn(
                                            'press inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                                            selected
                                                ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                                                : available
                                                    ? 'border-border hover:border-foreground'
                                                    : 'border-dashed border-border text-muted-foreground line-through hover:border-foreground',
                                        )}
                                    >
                                        <OptionSwatch color={option.customFields?.swatchColor} />
                                        {option.name}
                                        {!available && !selected && <span className="sr-only"> ({t('optionUnavailable')})</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>
                ))}

                {selectedVariant && (
                    <p className="text-sm">
                        {isInStock ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-success">
                                <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                                {t('inStock')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
                                <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
                                {t('outOfStock')}
                            </span>
                        )}
                    </p>
                )}

                <div className="flex items-center gap-3">
                    <div role="group" aria-label={t('quantity')} className="flex h-12 items-center rounded-md border border-border">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label={t('decreaseQuantity')}>
                            <Minus aria-hidden="true" />
                        </Button>
                        <span aria-live="polite" className="w-8 text-center font-mono">{quantity}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99} aria-label={t('increaseQuantity')}>
                            <Plus aria-hidden="true" />
                        </Button>
                    </div>
                    {/* En móvil el botón va en la barra fija de abajo. */}
                    <div className="hidden flex-1 lg:block">{addButton('h-12 w-full text-base')}</div>
                </div>

                {points > 0 && (
                    <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
                        <Star className="size-4 shrink-0 text-primary-solid" fill="currentColor" aria-hidden="true" />
                        {t('pointsEarned', {points})}
                    </p>
                )}

                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    {trust.map(({icon: Icon, label}) => (
                        <li key={label} className="flex items-center gap-2">
                            <Icon className="size-4 shrink-0 text-primary-solid" aria-hidden="true" />
                            {label}
                        </li>
                    ))}
                </ul>

                {selectedVariant && (
                    <p className="font-mono text-xs text-muted-foreground">
                        {selectedVariant.customFields?.netQuantity && <>{t('netQuantity', {quantity: selectedVariant.customFields.netQuantity})} · </>}
                        {t('sku', {sku: selectedVariant.sku})}
                    </p>
                )}
            </div>

            {/* Móvil: barra de compra fija abajo, para que la acción principal quede al
                alcance del pulgar esté donde esté el scroll. !mb-0: el space-y del
                contenedor le daba margen inferior y la separaba del borde. */}
            <div
                data-mobile-bar
                className="fixed inset-x-0 bottom-0 z-30 !mb-0 flex items-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden"
                style={{paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}
            >
                <p className="shrink-0 font-mono text-lg font-semibold">{price}</p>
                {addButton('h-12 flex-1 text-base')}
            </div>
        </>
    );
}
