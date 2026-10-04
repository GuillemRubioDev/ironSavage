'use client';

import {useRef, useState, useTransition} from 'react';
import Image from 'next/image';
import {Minus, Plus, ShoppingBag} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Sheet, SheetContent, SheetTitle} from '@/components/ui/sheet';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';
import {Link} from '@/platform/i18n/navigation';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {addToCart} from '@/features/products/add-to-cart';
import {getQuickAddProduct} from '@/features/products/quick-add';
import type {QuickAddProduct, QuickAddVariant} from '@/features/products/quick-add-data';
import {findVariant, initialSelection, isOptionAvailable, selectOption, type Selection} from '@/features/products/variant-selection';
import {Price} from '@/features/pricing/price';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';

type Loaded = QuickAddProduct & {currencyCode: string};

/**
 * Botón "Añadir" de las tarjetas. Al pulsarlo pide el producto (precio y stock al
 * día de la caché del catálogo). Con una sola variante la añade directamente; si no, abre el selector rápido:
 * un diálogo en escritorio o un panel desde abajo en móvil. La selección empieza
 * vacía en cada apertura, salvo los grupos de una sola opción, y no se guarda.
 */
export function QuickAddButton({slug, productName, inStock}: {slug: string; productName: string; inStock: boolean}) {
    const t = useTranslations('Product');
    const isMobile = useIsMobile();
    const [product, setProduct] = useState<Loaded | null>(null);
    const [open, setOpen] = useState(false);
    const [selection, setSelection] = useState<Selection>({});
    const [quantity, setQuantity] = useState(1);
    const [loading, startLoading] = useTransition();
    const [adding, startAdding] = useTransition();
    const buttonRef = useRef<HTMLButtonElement>(null);

    const add = (loaded: Loaded, variant: QuickAddVariant, qty: number) => startAdding(async () => {
        const result = await addToCart(variant.id, qty);
        if (!result.success) {
            toast.error(t('errorTitle'), {description: result.error || t('errorAddToCart')});
            return;
        }
        const price = toMajorUnits(variant.priceWithTax);
        trackEvent('add_to_cart', {
            currency: loaded.currencyCode,
            value: price * qty,
            items: [{item_id: variant.sku || variant.id, item_name: loaded.name, item_variant: variant.name, price, quantity: qty}],
        });
        toast.success(t('addedToCartMessage'), {description: t('addedToCartDescription', {name: loaded.name})});
        setOpen(false);
    });

    const busy = loading || adding;

    const handleClick = () => {
        if (busy) return;
        startLoading(async () => {
        const loaded = await getQuickAddProduct(slug);
        if (!loaded) {
            toast.error(t('errorTitle'), {description: t('productUnavailable')});
            return;
        }
        setProduct(loaded);
        setQuantity(1);
        setSelection(initialSelection(loaded.optionGroups));
        const only = loaded.variants.length === 1 ? loaded.variants[0] : undefined;
        if (only && only.stockLevel !== 'OUT_OF_STOCK') {
            add(loaded, only, 1);
            return;
        }
        setOpen(true);
        });
    };
    const body = product && (
        <QuickAddBody
            product={product}
            selection={selection}
            onSelect={(groupId, optionId) => setSelection(current => selectOption(product.variants, current, groupId, optionId))}
            quantity={quantity}
            onQuantity={setQuantity}
            adding={adding}
            onAdd={variant => add(product, variant, quantity)}
        />
    );

    return (
        <>
            {/* Mientras trabaja no se desactiva (aria-disabled): un botón desactivado pierde
                el foco y el teclado perdería su sitio en la rejilla. */}
            <Button
                ref={buttonRef}
                type="button"
                size="sm"
                className="w-full aria-disabled:opacity-70"
                disabled={!inStock}
                aria-disabled={busy || undefined}
                onClick={handleClick}
                // El nombre accesible incluye el texto visible ("Añadir") más el producto.
                aria-label={inStock && !busy ? t('quickAddLabel', {name: productName}) : undefined}
            >
                <ShoppingBag aria-hidden="true" />
                {!inStock ? t('outOfStock') : busy ? t('adding') : t('quickAdd')}
            </Button>
            {product && (isMobile ? (
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent side="bottom" finalFocus={buttonRef} className="max-h-[85vh] overflow-y-auto rounded-t-xl p-5">
                        <SheetTitle className="sr-only">{t('quickAddTitle')}</SheetTitle>
                        {body}
                    </SheetContent>
                </Sheet>
            ) : (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent finalFocus={buttonRef} className="sm:max-w-lg">
                        <DialogTitle className="sr-only">{t('quickAddTitle')}</DialogTitle>
                        {body}
                    </DialogContent>
                </Dialog>
            ))}
        </>
    );
}

function QuickAddBody({product, selection, onSelect, quantity, onQuantity, adding, onAdd}: {
    product: Loaded;
    selection: Selection;
    onSelect: (groupId: string, optionId: string) => void;
    quantity: number;
    onQuantity: (quantity: number) => void;
    adding: boolean;
    onAdd: (variant: QuickAddVariant) => void;
}) {
    const t = useTranslations('Product');
    const variant = findVariant(product.variants, product.optionGroups, selection);
    const image = variant?.imageUrl ?? product.imageUrl;
    const inStock = variant ? variant.stockLevel !== 'OUT_OF_STOCK' : false;
    const minPrice = Math.min(...product.variants.map(item => item.discountedPriceWithTax));
    const label = adding ? t('adding') : !variant ? t('selectOptions') : !inStock ? t('outOfStock') : t('addToCart');

    return (
        <div className="grid gap-5">
            <div className="flex gap-4 pr-8">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {image && <Image src={image} alt="" fill sizes="96px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                    <p className="font-display text-2xl font-extrabold uppercase italic leading-none">{product.name}</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                        {variant ? (
                            <PriceWithDiscount before={variant.priceWithTax} after={variant.discountedPriceWithTax} currencyCode={product.currencyCode} />
                        ) : (
                            <>
                                <span className="mr-1 font-sans text-xs font-normal text-muted-foreground">{t('from')}</span>
                                <Price value={minPrice} currencyCode={product.currencyCode} />
                            </>
                        )}
                    </p>
                    <Link href={`/productos/${product.slug}`} className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
                        {t('viewDetails')}
                    </Link>
                </div>
            </div>

            {product.optionGroups.map(group => (
                <fieldset key={group.id}>
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</legend>
                    <div className="flex flex-wrap gap-2">
                        {group.options.map(option => {
                            const selected = selection[group.id] === option.id;
                            const available = isOptionAvailable(product.variants, selection, group.id, option.id);
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => onSelect(group.id, option.id)}
                                    // Sin variante con lo ya elegido: se ve tachada pero se puede pulsar;
                                    // al pulsarla se quitan las elecciones que chocan (selectOption).
                                    className={cn(
                                        'press rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                        selected
                                            ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                                            : available
                                                ? 'border-border hover:border-foreground'
                                                : 'border-dashed border-border text-muted-foreground line-through hover:border-foreground',
                                    )}
                                >
                                    {option.name}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            ))}

            <div className="flex items-center gap-3">
                <div role="group" aria-label={t('quantity')} className="flex items-center rounded-md border border-border">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label={t('decreaseQuantity')}>
                        <Minus aria-hidden="true" />
                    </Button>
                    <span aria-live="polite" className="w-8 text-center font-mono text-sm">{quantity}</span>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => onQuantity(Math.min(99, quantity + 1))} disabled={quantity >= 99} aria-label={t('increaseQuantity')}>
                        <Plus aria-hidden="true" />
                    </Button>
                </div>
                <Button type="button" size="lg" className="flex-1" disabled={!variant || !inStock || adding} onClick={() => variant && onAdd(variant)}>
                    {label}
                </Button>
            </div>
        </div>
    );
}
