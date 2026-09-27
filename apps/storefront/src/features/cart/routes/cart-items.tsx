import Image from 'next/image';
import { Link } from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Price} from '@/features/pricing/price';
import {QuantityControl} from './quantity-control';
import {getTranslations} from 'next-intl/server';

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
            <div className="container mx-auto px-4 py-16">
                <div className="text-center">
                    <h1 className="text-display text-3xl font-bold mb-4">{t('empty')}</h1>
                    <p className="text-muted-foreground mb-8">
                        {t('emptyMessage')}
                    </p>
                    <Button render={<Link href="/" />} nativeButton={false}>{t('continueShopping')}</Button>
                </div>
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
                                className="rounded-md object-cover w-full sm:w-[100px] h-[100px]"
                            />
                        </Link>
                    )}

                    <div className="flex-grow min-w-0">
                        <Link
                            href={`/productos/${line.productVariant.product.slug}`}
                            className="text-display font-semibold hover:text-primary transition-colors block"
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
                            <QuantityControl lineId={line.id} quantity={line.quantity}/>

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
