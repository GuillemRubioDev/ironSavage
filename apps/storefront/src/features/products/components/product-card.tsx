import Image from 'next/image';
import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {ProductCardFragment} from '@/features/products/graphql';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';
import {ProductBadges} from '@/features/products/components/product-badges';
import {discountPercent} from '@/features/pricing/discount-percent';
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
    const cardBefore =
        product.priceWithTax.__typename === 'PriceRange'
            ? product.priceWithTax.min
            : product.priceWithTax.__typename === 'SinglePrice'
              ? product.priceWithTax.value
              : 0;
    const cardDiscountPercent = discountPercent(cardBefore, product.discountedPriceWithTax.min);

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
                <ProductBadges percent={cardDiscountPercent} isNew={product.isNew} />
                {!product.inStock && (
                    <span className="absolute bottom-3 left-3 bg-background/95 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t('outOfStock')}
                    </span>
                )}
            </div>
            {/* El relleno horizontal importa aunque la imagen de arriba ocupe todo el
                ancho: esta tarjeta se reutiliza en ProductCarousel, donde el contenido
                de la primera diapositiva queda pegado al borde con overflow-hidden del
                carrusel; sin relleno, se cortaban el título y el precio de esa tarjeta. */}
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
                                    <PriceWithDiscount before={product.priceWithTax.min} after={product.discountedPriceWithTax.min} currencyCode={product.currencyCode}/>
                                </>
                            ) : (
                                <PriceWithDiscount before={product.priceWithTax.min} after={product.discountedPriceWithTax.min} currencyCode={product.currencyCode}/>
                            )
                        ) : product.priceWithTax.__typename === 'SinglePrice' ? (
                            <PriceWithDiscount before={product.priceWithTax.value} after={product.discountedPriceWithTax.min} currencyCode={product.currencyCode}/>
                        ) : null}
                    </p>
                </Suspense>
            </div>
        </Link>
    );
}
