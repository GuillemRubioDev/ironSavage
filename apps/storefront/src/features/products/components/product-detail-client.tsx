'use client';

import {useEffect, useMemo, useState} from 'react';
import {toMajorUnits, trackEvent} from '@/platform/analytics/gtag';
import {useSearchParams} from 'next/navigation';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {ProductImageCarousel} from '@/features/products/components/product-image-carousel';
import {ProductInfo} from '@/features/products/components/product-info';
import {ProductBadges} from '@/features/products/components/product-badges';
import {discountPercent} from '@/features/pricing/discount-percent';

interface Asset {
    id: string;
    preview: string;
    source: string;
}

interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    discountedPriceWithTax: number;
    stockLevel: string;
    customFields?: {netQuantity?: string | null; isNew?: boolean | null} | null;
    featuredAsset?: Asset | null;
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

interface ProductDetailClientProps {
    product: {
        id: string;
        name: string;
        description: string;
        customFields?: {isNew?: boolean | null} | null;
        assets: Asset[];
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
    searchParams: { [key: string]: string | string[] | undefined };
    currencyCode: string;
}

export function ProductDetailClient({product, searchParams, currencyCode}: ProductDetailClientProps) {
    const pathname = usePathname();
    const router = useRouter();
    const currentSearchParams = useSearchParams();

    // Inicializa las opciones seleccionadas desde la URL
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
        const initialOptions: Record<string, string> = {};

        product.optionGroups.forEach((group) => {
            const paramValue = searchParams[group.code];
            if (typeof paramValue === 'string') {
                const option = group.options.find((opt) => opt.code === paramValue);
                if (option) {
                    initialOptions[group.id] = option.id;
                }
            }
        });

        return initialOptions;
    });

    // Busca la variante que corresponde a las opciones seleccionadas
    const selectedVariant = useMemo(() => {
        if (product.variants.length === 1) {
            return product.variants[0];
        }

        if (Object.keys(selectedOptions).length !== product.optionGroups.length) {
            return null;
        }

        return product.variants.find((variant) => {
            const variantOptionIds = variant.options.map((opt) => opt.id);
            const selectedOptionIds = Object.values(selectedOptions);
            return selectedOptionIds.every((optId) => variantOptionIds.includes(optId));
        });
    }, [selectedOptions, product.variants, product.optionGroups]);

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

    const handleOptionChange = (groupId: string, optionId: string) => {
        setSelectedOptions((prev) => ({
            ...prev,
            [groupId]: optionId,
        }));

        const group = product.optionGroups.find((g) => g.id === groupId);
        const option = group?.options.find((opt) => opt.id === optionId);

        if (group && option) {
            const params = new URLSearchParams(currentSearchParams);
            params.set(group.code, option.code);
            router.push(`${pathname}?${params.toString()}`, {scroll: false});
        }
    };

    // Muestra primero la foto propia de la variante seleccionada; si no tiene, la
    // galería general del producto.
    const images = useMemo(() => {
        const variantAsset = selectedVariant?.featuredAsset;
        if (variantAsset) {
            const rest = product.assets.filter((asset) => asset.id !== variantAsset.id);
            return [variantAsset, ...rest];
        }
        return product.assets;
    }, [selectedVariant, product.assets]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-16">
            <div className="relative lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:self-start">
                <ProductImageCarousel key={selectedVariant?.id ?? 'default'} images={images} productName={product.name} />
                <ProductBadges
                    percent={
                        selectedVariant
                            ? discountPercent(selectedVariant.priceWithTax, selectedVariant.discountedPriceWithTax)
                            : 0
                    }
                    isNew={(product.customFields?.isNew ?? false) || (selectedVariant?.customFields?.isNew ?? false)}
                />
            </div>
            <div>
                <ProductInfo
                    product={product}
                    currencyCode={currencyCode}
                    selectedOptions={selectedOptions}
                    selectedVariant={selectedVariant}
                    onOptionChange={handleOptionChange}
                />
            </div>
        </div>
    );
}
