import type {ReactNode} from 'react';
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
    /** Recargos del pedido; el canje de puntos es uno negativo (sku LOYALTY_POINTS_DISCOUNT). */
    surcharges?: Array<{
        id: string;
        sku: string | null;
        description: string;
        priceWithTax: number;
    }> | null;
};

/**
 * Vendure devuelve una entrada de taxSummary por cada pareja (taxRate, taxCategory),
 * así que el IVA de un producto y el del envío al mismo 21 % salen como dos entradas
 * separadas, lo que confunde si se muestra tal cual («IVA (21%)» dos veces). Antes
 * de mostrarlas se suman las entradas del mismo tipo.
 */
function combineTaxByRate(taxSummary: ActiveOrder['taxSummary']) {
    const byRate = new Map<number, number>();
    for (const tax of taxSummary) {
        byRate.set(tax.taxRate, (byRate.get(tax.taxRate) ?? 0) + tax.taxTotal);
    }
    return [...byRate.entries()].map(([taxRate, taxTotal]) => ({taxRate, taxTotal}));
}

/**
 * Resumen del carrito en zona de marca (oscuro en los dos temas): subtotal, descuentos,
 * recargos (canje de puntos), envío, canje (hueco que rellena la feature de puntos) y
 * total con IVA. En móvil, además, una barra fija abajo con el total y Finalizar compra.
 */
export async function OrderSummary({activeOrder, redemptionSlot}: { activeOrder: ActiveOrder; redemptionSlot?: ReactNode }) {
    const t = await getTranslations('Cart');
    const combinedTax = combineTaxByRate(activeOrder.taxSummary ?? []);
    const total = <Price value={activeOrder.totalWithTax} currencyCode={activeOrder.currencyCode}/>;

    return (
        <>
            <div className="rounded-lg bg-brand p-6 text-brand-fg lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]">
                <h2 className="mb-1 text-3xl">{t('orderSummary')}</h2>
                <p className="mb-5 text-xs text-brand-muted">{t('pricesIncludeTax')}</p>

                <div className="mb-5 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">{t('subtotal')}</span>
                        <span className="font-mono"><Price value={activeOrder.subTotalWithTax} currencyCode={activeOrder.currencyCode}/></span>
                    </div>
                    {activeOrder.discounts?.map((discount, index) => (
                        <div key={index} className="flex justify-between text-sm font-medium text-primary-text">
                            <span>{discount.description}</span>
                            <span className="font-mono"><Price value={discount.amountWithTax} currencyCode={activeOrder.currencyCode}/></span>
                        </div>
                    ))}
                    {activeOrder.surcharges?.map((surcharge) => (
                        <div key={surcharge.id} className={`flex justify-between text-sm ${surcharge.priceWithTax < 0 ? 'font-medium text-primary-text' : ''}`}>
                            <span>{surcharge.description}</span>
                            <span className="font-mono"><Price value={surcharge.priceWithTax} currencyCode={activeOrder.currencyCode}/></span>
                        </div>
                    ))}
                    <div className="flex justify-between text-sm">
                        <span className="text-brand-muted">{t('shipping')}</span>
                        <span className="font-mono">
                            {activeOrder.shippingWithTax > 0
                                ? <Price value={activeOrder.shippingWithTax} currencyCode={activeOrder.currencyCode}/>
                                : t('calculatedAtCheckout')}
                        </span>
                    </div>
                </div>

                {redemptionSlot && <div className="mb-5">{redemptionSlot}</div>}

                <div className="mb-6 border-t border-brand-line pt-4">
                    <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold">{t('total')}</span>
                        <span className="font-mono text-3xl font-semibold">{total}</span>
                    </div>
                    {combinedTax.map((tax, index) => (
                        <div key={index} className="mt-1 flex justify-between text-xs text-brand-muted">
                            <span>{t('taxIncludedNote', {rate: tax.taxRate})}</span>
                            <span className="font-mono"><Price value={tax.taxTotal} currencyCode={activeOrder.currencyCode}/></span>
                        </div>
                    ))}
                </div>

                <Button render={<Link href="/checkout" />} nativeButton={false} className="w-full" size="xl">{t('proceedToCheckout')}</Button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-brand-muted">
                    <Lock className="size-3" aria-hidden="true" />
                    <span>{t('secureCheckout')}</span>
                </div>

                <Button render={<Link href="/productos" />} nativeButton={false} variant="brand" className="mt-3 w-full">{t('continueShopping')}</Button>
            </div>

            {/* Móvil: el total y Finalizar compra siempre a mano, abajo. */}
            <div
                className="lg:hidden fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-brand-line bg-brand px-4 py-3 text-brand-fg"
                style={{paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'}}
            >
                <p className="shrink-0">
                    <span className="block text-[11px] uppercase tracking-wide text-brand-muted">{t('total')}</span>
                    <span className="font-mono text-lg font-semibold">{total}</span>
                </p>
                <Button render={<Link href="/checkout" />} nativeButton={false} className="h-12 flex-1" size="lg">{t('proceedToCheckout')}</Button>
            </div>
        </>
    );
}
