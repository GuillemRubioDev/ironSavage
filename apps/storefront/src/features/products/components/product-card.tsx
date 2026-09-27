import Image from 'next/image';
import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';
import {Price} from '@/features/pricing/price';
import {Suspense} from "react";
import { Link } from '@/platform/i18n/navigation';
import {useTranslations} from 'next-intl';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    categoryName?: string;
}

export function ProductCard({product: productProp, categoryName}: ProductCardProps) {
    const t = useTranslations('Product');
    const product = readFragment(ProductCardFragment, productProp);

    return (
        <Link
            href={`/productos/${product.slug}`}
            className="group block"
        >
            <div className="aspect-square relative bg-muted overflow-hidden rounded-md">
                {product.productAsset ? (
                    <Image
                        src={product.productAsset.preview}
                        alt={product.productName}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {t('noImage')}
                    </div>
                )}
                {!product.inStock && (
                    <span className="absolute top-3 left-3 bg-background/95 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('outOfStock')}
                    </span>
                )}
            </div>
            {/* Horizontal padding matters here even though the image above is
                edge-to-edge: this card is reused inside ProductCarousel,
                where the first slide's content sits at zero margin against
                the carousel's own overflow-hidden viewport edge — no padding
                here clipped that first card's title/price against it. */}
            <div className="pt-3 px-4 space-y-1">
                {categoryName && (
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {categoryName}
                    </p>
                )}
                <h3 className="text-display font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {product.productName}
                </h3>
                <Suspense fallback={<div className="h-6 w-28 rounded bg-muted"></div>}>
                    <p className="font-mono text-base font-semibold tracking-tight tabular-nums">
                        {product.priceWithTax.__typename === 'PriceRange' ? (
                            product.priceWithTax.min !== product.priceWithTax.max ? (
                                <>
                                    <span className="font-sans text-xs font-normal normal-case text-muted-foreground mr-1">{t('from')}</span>
                                    <Price value={product.priceWithTax.min} currencyCode={product.currencyCode}/>
                                </>
                            ) : (
                                <Price value={product.priceWithTax.min} currencyCode={product.currencyCode}/>
                            )
                        ) : product.priceWithTax.__typename === 'SinglePrice' ? (
                            <Price value={product.priceWithTax.value} currencyCode={product.currencyCode}/>
                        ) : null}
                    </p>
                </Suspense>
            </div>
        </Link>
    );
}
