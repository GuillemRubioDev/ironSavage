import { Link } from '@/platform/i18n/navigation';
import {Button} from '@/components/ui/button';
import {Lock} from 'lucide-react';
import {Price} from '@/features/pricing/price';
import {getTranslations} from 'next-intl/server';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    subTotalWithTax: number;
    shipping: number;
    shippingWithTax: number;
    totalWithTax: number;
    taxSummary: Array<{
        description: string;
        taxRate: number;
        taxTotal: number;
    }>;
    discounts?: Array<{
        description: string;
        amountWithTax: number;
    }> | null;
};

/**
 * Vendure reports one taxSummary entry per (taxRate, taxCategory) pair, so a
 * product tax line and a shipping tax line at the same 21% show up as two
 * separate entries — confusing when displayed as-is ("IVA (21%)" twice).
 * Combine entries that share a rate into one total before rendering.
 */
function combineTaxByRate(taxSummary: ActiveOrder['taxSummary']) {
    const byRate = new Map<number, number>();
    for (const tax of taxSummary) {
        byRate.set(tax.taxRate, (byRate.get(tax.taxRate) ?? 0) + tax.taxTotal);
    }
    return [...byRate.entries()].map(([taxRate, taxTotal]) => ({taxRate, taxTotal}));
}

export async function OrderSummary({activeOrder}: { activeOrder: ActiveOrder }) {
    const t = await getTranslations('Cart');
    const combinedTax = combineTaxByRate(activeOrder.taxSummary ?? []);
    return (
        <div className="border rounded-xl p-6 bg-card sticky top-24 shadow-sm">
            <h2 className="text-xl font-bold mb-1">{t('orderSummary')}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t('pricesIncludeTax')}</p>

            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span>
                        <Price value={activeOrder.subTotalWithTax} currencyCode={activeOrder.currencyCode}/>
                    </span>
                </div>
                {activeOrder.discounts && activeOrder.discounts.length > 0 && (
                    <>
                        {activeOrder.discounts.map((discount, index) => (
                            <div key={index} className="flex justify-between text-sm text-primary font-medium">
                                <span>{discount.description}</span>
                                <span>
                                    <Price value={discount.amountWithTax} currencyCode={activeOrder.currencyCode}/>
                                </span>
                            </div>
                        ))}
                    </>
                )}
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('shipping')}</span>
                    <span>
                        {activeOrder.shippingWithTax > 0
                            ? <Price value={activeOrder.shippingWithTax} currencyCode={activeOrder.currencyCode}/>
                            : t('calculatedAtCheckout')}
                    </span>
                </div>
            </div>

            <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-baseline text-lg font-bold">
                    <span>{t('total')}</span>
                    <span className="text-2xl">
                        <Price value={activeOrder.totalWithTax} currencyCode={activeOrder.currencyCode}/>
                    </span>
                </div>
                {combinedTax.map((tax, index) => (
                    <div key={index} className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{t('taxIncludedNote', {rate: tax.taxRate})}</span>
                        <span>
                            <Price value={tax.taxTotal} currencyCode={activeOrder.currencyCode}/>
                        </span>
                    </div>
                ))}
            </div>

            <Button render={<Link href="/checkout" />} nativeButton={false} className="w-full" size="lg">{t('proceedToCheckout')}</Button>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>{t('secureCheckout')}</span>
            </div>

            <Button render={<Link href="/" />} nativeButton={false} variant="outline" className="w-full mt-3">{t('continueShopping')}</Button>
        </div>
    );
}
