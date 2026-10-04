'use client';

import {useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Separator} from '@/components/ui/separator';
import {ShoppingCart, CheckCircle2} from 'lucide-react';
import {addToCart} from '@/features/products/add-to-cart';
import {toast} from 'sonner';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';
import {useTranslations} from 'next-intl';

interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    discountedPriceWithTax: number;
    stockLevel: string;
    customFields?: {netQuantity?: string | null} | null;
    options: Array<{
        id: string;
        code: string;
        name: string;
        groupId: string;
        group: {
            id: string;
            code: string;
            name: string;
        };
    }>;
}

interface ProductInfoProps {
    product: {
        id: string;
        name: string;
        description: string;
        variants: ProductVariant[];
        optionGroups: Array<{
            id: string;
            code: string;
            name: string;
            options: Array<{
                id: string;
                code: string;
                name: string;
            }>;
        }>;
    };
    currencyCode: string;
    selectedOptions: Record<string, string>;
    selectedVariant: ProductVariant | null | undefined;
    onOptionChange: (groupId: string, optionId: string) => void;
}

export function ProductInfo({product, currencyCode, selectedOptions, selectedVariant, onOptionChange}: ProductInfoProps) {
    const t = useTranslations('Product');
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);

    const handleAddToCart = async () => {
        if (!selectedVariant) return;

        startTransition(async () => {
            const result = await addToCart(selectedVariant.id, 1);

            if (result.success) {
                setIsAdded(true);
                const price = toMajorUnits(selectedVariant.priceWithTax);
                trackEvent('add_to_cart', {
                    currency: currencyCode,
                    value: price,
                    items: [{item_id: selectedVariant.sku || selectedVariant.id, item_name: product.name, item_variant: selectedVariant.name, price, quantity: 1}],
                });
                toast.success(t('addedToCartMessage'), {
                    description: t('addedToCartDescription', {name: product.name}),
                });

                // Quita el estado «añadido» a los 2 segundos
                setTimeout(() => setIsAdded(false), 2000);
            } else {
                toast.error(t('errorTitle'), {
                    description: result.error || t('errorAddToCart'),
                });
            }
        });
    };

    const isInStock = selectedVariant && selectedVariant.stockLevel !== 'OUT_OF_STOCK';
    const canAddToCart = selectedVariant && isInStock;

    const buttonLabel = isAdded
        ? t('addedToCart')
        : isPending
            ? t('adding')
            : !selectedVariant && product.optionGroups.length > 0
                ? t('selectOptions')
                : !isInStock
                    ? t('outOfStock')
                    : t('addToCart');

    return (
        <>
        <div className="space-y-6">
            {/* Título y precio del producto */}
            <div className="space-y-3">
                <h1 className="text-display text-3xl md:text-4xl font-bold">{product.name}</h1>
                {selectedVariant && (
                    <div>
                        <p className="font-mono text-2xl md:text-3xl font-semibold tabular-nums">
                            <PriceWithDiscount
                                before={selectedVariant.priceWithTax}
                                after={selectedVariant.discountedPriceWithTax}
                                currencyCode={currencyCode}
                                size="lg"
                            />
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{t('taxIncluded')}</p>
                    </div>
                )}
            </div>

            <Separator />

            {/* Descripción del producto */}
            <div className="prose prose-sm max-w-none text-muted-foreground">
                <div dangerouslySetInnerHTML={{__html: product.description}}/>
            </div>

            {/* Grupos de opciones */}
            {product.optionGroups.length > 0 && (
                <div className="space-y-5">
                    {product.optionGroups.map((group) => (
                        <div key={group.id} className="space-y-3">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {group.name}
                            </Label>
                            <RadioGroup
                                value={selectedOptions[group.id] || ''}
                                onValueChange={(value) => onOptionChange(group.id, value)}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {group.options.map((option) => (
                                        <div key={option.id}>
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={option.id}
                                                className="flex items-center justify-center border border-border bg-popover px-5 py-2.5 text-sm font-medium hover:border-foreground/40 peer-data-[checked]:border-primary peer-data-[checked]:bg-primary peer-data-[checked]:text-primary-foreground cursor-pointer transition-colors"
                                            >
                                                {option.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>
                    ))}
                </div>
            )}

            {/* Estado del stock */}
            {selectedVariant && (
                <div className="text-sm">
                    {isInStock ? (
                        <span className="inline-flex items-center gap-1.5 text-success font-medium">
                            <span className="h-2 w-2 rounded-full bg-success" />
                            {t('inStock')}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-destructive font-medium">
                            <span className="h-2 w-2 rounded-full bg-destructive" />
                            {t('outOfStock')}
                        </span>
                    )}
                </div>
            )}

            {/* Botón de añadir al carrito: oculto en móvil, donde lo sustituye la barra fija de abajo */}
            <div className="hidden lg:block pt-2">
                <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold"
                    disabled={!canAddToCart || isPending}
                    onClick={handleAddToCart}
                >
                    {isAdded ? <CheckCircle2 className="mr-2 h-5 w-5"/> : <ShoppingCart className="mr-2 h-5 w-5"/>}
                    {buttonLabel}
                </Button>
            </div>

            {/* Referencia (SKU) */}
            {selectedVariant?.customFields?.netQuantity && (
                <div className="text-sm text-muted-foreground">
                    {t('netQuantity', {quantity: selectedVariant.customFields.netQuantity})}
                </div>
            )}
            {selectedVariant && (
                <div className="font-mono text-xs text-muted-foreground">
                    {t('sku', {sku: selectedVariant.sku})}
                </div>
            )}
        </div>

        {/* Móvil: barra de compra fija abajo, para que la acción principal quede al
            alcance del pulgar esté donde esté el scroll; un botón normal (como en
            escritorio) quedaría fuera de vista tras la descripción, las opciones y
            las preguntas frecuentes en una ficha larga. */}
        <div
            className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 flex items-center gap-3"
            style={{paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}
        >
            {selectedVariant && (
                <p className="font-mono text-lg font-semibold tabular-nums shrink-0">
                    <PriceWithDiscount
                        before={selectedVariant.priceWithTax}
                        after={selectedVariant.discountedPriceWithTax}
                        currencyCode={currencyCode}
                    />
                </p>
            )}
            <Button
                size="lg"
                className="flex-1 h-12 text-base font-semibold"
                disabled={!canAddToCart || isPending}
                onClick={handleAddToCart}
            >
                {isAdded ? <CheckCircle2 className="mr-2 h-5 w-5"/> : <ShoppingCart className="mr-2 h-5 w-5"/>}
                {buttonLabel}
            </Button>
        </div>
        </>
    );
}
