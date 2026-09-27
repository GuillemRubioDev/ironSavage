'use client';

import {useMemo, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {usePathname, useRouter} from '@/platform/i18n/navigation';
import {ProductImageCarousel} from '@/features/products/components/product-image-carousel';
import {ProductInfo} from '@/features/products/components/product-info';

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
    stockLevel: string;
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

    // Initialize selected options from URL
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

    // Find the matching variant based on selected options
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

    // Show the selected variant's own photo first, falling back to the product's
    // general gallery when the variant has none of its own.
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
            <div className="lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)] lg:self-start">
                <ProductImageCarousel key={selectedVariant?.id ?? 'default'} images={images} />
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
