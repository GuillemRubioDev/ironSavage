import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {FragmentOf, readFragment} from '@/platform/vendure/graphql';
import {Link} from '@/platform/i18n/navigation';
import {ProductCardFragment} from '@/features/products/graphql';
import {PriceWithDiscount} from '@/features/pricing/price-with-discount';
import {discountPercent} from '@/features/pricing/discount-percent';
import {ProductBadges} from '@/features/products/components/product-badges';
import {QuickAddButton} from '@/features/products/components/quick-add-button';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    categoryName?: string;
}

/**
 * Tarjeta de producto: imagen (o el nombre en grande si no hay foto), etiquetas
 * Nuevo/Oferta, categoría principal, nombre, "desde X €" y botón Añadir con el
 * selector rápido. La imagen repite el enlace del nombre, así que queda fuera del
 * orden de tabulación y oculta a lectores de pantalla: una sola parada por producto
 * más el botón.
 */
export function ProductCard({product: productProp, categoryName}: ProductCardProps) {
    const t = useTranslations('Product');
    const product = readFragment(ProductCardFragment, productProp);
    const href = `/productos/${product.slug}`;
    const price = product.priceWithTax;
    const before = price.__typename === 'PriceRange' ? price.min : price.__typename === 'SinglePrice' ? price.value : 0;
    const isRange = price.__typename === 'PriceRange' && price.min !== price.max;

    return (
        <article className="hover-lift group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
            <Link href={href} tabIndex={-1} aria-hidden="true" className="img-zoom relative block aspect-square overflow-hidden bg-muted">
                {product.productAsset ? (
                    <Image
                        src={product.productAsset.preview}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center p-4 text-center font-display text-3xl font-black uppercase italic leading-none text-foreground/15 md:text-4xl">
                        {product.productName}
                    </span>
                )}
                <ProductBadges percent={discountPercent(before, product.discountedPriceWithTax.min)} isNew={product.isNew} />
                {!product.inStock && (
                    <span className="absolute bottom-3 left-3 rounded bg-background/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('outOfStock')}
                    </span>
                )}
            </Link>
            <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
                {categoryName && (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{categoryName}</p>
                )}
                <h3 className="text-lg leading-tight md:text-xl">
                    <Link href={href} className="line-clamp-2 transition-colors hover:text-primary">{product.productName}</Link>
                </h3>
                <p className="mt-auto pt-2 font-mono text-base font-semibold">
                    {isRange && <span className="mr-1 font-sans text-xs font-normal normal-case text-muted-foreground">{t('from')}</span>}
                    <PriceWithDiscount before={before} after={product.discountedPriceWithTax.min} currencyCode={product.currencyCode} />
                </p>
                <div className="pt-2">
                    <QuickAddButton slug={product.slug} productName={product.productName} inStock={product.inStock} />
                </div>
            </div>
        </article>
    );
}
