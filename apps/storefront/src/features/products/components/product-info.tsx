'use client';

import {useState, useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Separator} from '@/components/ui/separator';
import {ShoppingCart, CheckCircle2} from 'lucide-react';
import {addToCart} from '@/features/products/add-to-cart';
import {toast} from 'sonner';
import {Price} from '@/features/pricing/price';
import {useTranslations} from 'next-intl';

interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    stockLevel: string;
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
                toast.success(t('addedToCartMessage'), {
                    description: t('addedToCartDescription', {name: product.name}),
                });

                // Reset the added state after 2 seconds
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

    return (
        <div className="space-y-6">
            {/* Product Title & Price */}
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{product.name}</h1>
                {selectedVariant && (
                    <p className="text-2xl md:text-3xl text-muted-foreground font-semibold mt-3">
                        <Price value={selectedVariant.priceWithTax} currencyCode={currencyCode}/>
                    </p>
                )}
            </div>

            <Separator />

            {/* Product Description */}
            <div className="prose prose-sm max-w-none text-muted-foreground">
                <div dangerouslySetInnerHTML={{__html: product.description}}/>
            </div>

            {/* Option Groups */}
            {product.optionGroups.length > 0 && (
                <div className="space-y-5">
                    {product.optionGroups.map((group) => (
                        <div key={group.id} className="space-y-3">
                            <Label className="text-base font-semibold">
                                {group.name}
                            </Label>
                            <RadioGroup
                                value={selectedOptions[group.id] || ''}
                                onValueChange={(value) => onOptionChange(group.id, value)}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {group.options.map((option) => (
                                        <div key={option.id}>
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={option.id}
                                                className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover px-4 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground peer-data-[checked]:border-primary peer-data-[checked]:ring-2 peer-data-[checked]:ring-primary/20 peer-data-[checked]:bg-primary/5 cursor-pointer transition-all"
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

            {/* Stock Status */}
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

            {/* Add to Cart Button */}
            <div className="pt-2 space-y-3">
                <Button
                    size="lg"
                    className="w-full h-12 text-base font-semibold rounded-lg"
                    disabled={!canAddToCart || isPending}
                    onClick={handleAddToCart}
                >
                    {isAdded ? (
                        <>
                            <CheckCircle2 className="mr-2 h-5 w-5"/>
                            {t('addedToCart')}
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="mr-2 h-5 w-5"/>
                            {isPending
                                ? t('adding')
                                : !selectedVariant && product.optionGroups.length > 0
                                    ? t('selectOptions')
                                    : !isInStock
                                        ? t('outOfStock')
                                        : t('addToCart')}
                        </>
                    )}
                </Button>
            </div>

            {/* SKU */}
            {selectedVariant && (
                <div className="text-xs text-muted-foreground">
                    {t('sku', {sku: selectedVariant.sku})}
                </div>
            )}
        </div>
    );
}
