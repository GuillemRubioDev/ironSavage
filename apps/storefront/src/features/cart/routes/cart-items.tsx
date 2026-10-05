import Image from 'next/image';
import { Link } from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Price} from '@/features/pricing/price';
import {QuantityControl} from './quantity-control';
import {getTranslations} from 'next-intl/server';
import {ShoppingBag} from 'lucide-react';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    lines: Array<{
        id: string;
        quantity: number;
        unitPriceWithTax: number;
        discountedUnitPriceWithTax: number;
        linePriceWithTax: number;
        discountedLinePriceWithTax: number;
        productVariant: {
            id: string;
            name: string;
            sku: string;
            product: {
                name: string;
                slug: string;
                featuredAsset?: {
                    preview: string;
                } | null;
            };
        };
    }>;
};

export async function CartItems({activeOrder}: { activeOrder: ActiveOrder | null }) {
    const t = await getTranslations('Cart');
    if (!activeOrder || activeOrder.lines.length === 0) {
        return (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
                <ShoppingBag className="size-12 text-muted-foreground" aria-hidden="true" />
                <p className="text-display text-3xl">{t('empty')}</p>
                <p className="max-w-md text-muted-foreground">{t('emptyMessage')}</p>
                <Button render={<Link href="/productos" />} nativeButton={false} size="lg">{t('continueShopping')}</Button>
            </div>
        );
    }

    return (
        <div className="lg:col-span-2 divide-y divide-border border-t border-border">
            {activeOrder.lines.map((line) => (
                <div
                    key={line.id}
                    className="flex flex-col sm:flex-row gap-4 py-5"
                >
                    {line.productVariant.product.featuredAsset && (
                        <Link
                            href={`/productos/${line.productVariant.product.slug}`}
                            className="flex-shrink-0"
                        >
                            <Image
                                src={line.productVariant.product.featuredAsset.preview}
                                alt={line.productVariant.name}
                                width={120}
                                height={120}
                                className="h-[100px] w-full rounded-lg bg-muted object-cover sm:w-[100px]"
                            />
                        </Link>
                    )}

                    <div className="flex-grow min-w-0">
                        <Link
                            href={`/productos/${line.productVariant.product.slug}`}
                            className="block font-display text-lg font-extrabold uppercase italic leading-tight transition-colors hover:text-primary"
                        >
                            {line.productVariant.product.name}
                        </Link>
                        {line.productVariant.name !== line.productVariant.product.name && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {line.productVariant.name}
                            </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('sku', {sku: line.productVariant.sku})}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 sm:hidden flex items-center gap-2">
                            {line.discountedUnitPriceWithTax < line.unitPriceWithTax && (
                                <span className="line-through">
                                    <Price value={line.unitPriceWithTax} currencyCode={activeOrder.currencyCode}/>
                                </span>
                            )}
                            <Price value={line.discountedUnitPriceWithTax} currencyCode={activeOrder.currencyCode}/> {t('each')}
                        </p>

                        <div className="flex items-center gap-3 mt-4">
                            <QuantityControl lineId={line.id} quantity={line.quantity} productName={line.productVariant.name}/>

                            <div className="sm:hidden ml-auto">
                                <p className="font-mono font-semibold text-lg tabular-nums">
                                    <Price value={line.discountedLinePriceWithTax}
                                           currencyCode={activeOrder.currencyCode}/>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:block text-right flex-shrink-0">
                        <p className="font-mono font-semibold text-lg tabular-nums">
                            <Price value={line.discountedLinePriceWithTax} currencyCode={activeOrder.currencyCode}/>
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center justify-end gap-2">
                            {line.discountedUnitPriceWithTax < line.unitPriceWithTax && (
                                <span className="line-through">
                                    <Price value={line.unitPriceWithTax} currencyCode={activeOrder.currencyCode}/>
                                </span>
                            )}
                            <Price value={line.discountedUnitPriceWithTax} currencyCode={activeOrder.currencyCode}/> {t('each')}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
