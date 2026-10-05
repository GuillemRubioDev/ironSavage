'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Tag } from 'lucide-react';
import { OrderLine } from './types';
import { useCheckout } from './checkout-provider';
import { Price } from '@/features/pricing/price';
import {useTranslations} from 'next-intl';

/**
 * Vendure devuelve una entrada de taxSummary por cada pareja (taxRate, taxCategory),
 * así que el IVA de un producto y el del envío al mismo 21 % salen como dos entradas
 * separadas, lo que confunde si se muestra tal cual («IVA (21%)» dos veces). Antes
 * de mostrarlas se suman las entradas del mismo tipo.
 */
function combineTaxByRate(taxSummary: ReturnType<typeof useCheckout>['order']['taxSummary']) {
  const byRate = new Map<number, number>();
  for (const tax of taxSummary ?? []) {
    byRate.set(tax.taxRate, (byRate.get(tax.taxRate) ?? 0) + tax.taxTotal);
  }
  return [...byRate.entries()].map(([taxRate, taxTotal]) => ({ taxRate, taxTotal }));
}

function OrderSummaryContent({ order, t }: { order: ReturnType<typeof useCheckout>['order']; t: ReturnType<typeof useTranslations<'Checkout'>> }) {
  const combinedTax = combineTaxByRate(order.taxSummary);
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {order.lines.map((line: OrderLine) => (
          <div key={line.id} className="flex gap-3">
            {line.productVariant.product.featuredAsset ? (
              <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-brand-surface">
                <Image
                  src={line.productVariant.product.featuredAsset.preview}
                  alt={line.productVariant.name}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-brand-surface flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-brand-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">
                {line.productVariant.product.name}
              </p>
              {line.productVariant.name !== line.productVariant.product.name && (
                <p className="text-xs text-brand-muted">
                  {line.productVariant.name}
                </p>
              )}
              <p className="text-xs text-brand-muted">
                {t('qty', {quantity: line.quantity})}
              </p>
            </div>
            <div className="text-sm font-medium text-right">
              {line.discountedLinePriceWithTax < line.linePriceWithTax && (
                <p className="text-xs text-brand-muted line-through">
                  <Price value={line.linePriceWithTax} currencyCode={order.currencyCode} />
                </p>
              )}
              <Price value={line.discountedLinePriceWithTax} currencyCode={order.currencyCode} />
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-brand-line" />

      <p className="text-xs text-brand-muted -mt-1">{t('pricesIncludeTax')}</p>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-brand-muted">{t('subtotal')}</span>
          <span>
            <Price value={order.subTotalWithTax} currencyCode={order.currencyCode} />
          </span>
        </div>

        {order.discounts && order.discounts.length > 0 && (
          <>
            {order.discounts.map((discount, index: number) => (
              <div key={index} className="flex justify-between text-sm text-primary-text font-medium">
                <span>{discount.description}</span>
                <span>
                  <Price value={discount.amountWithTax} currencyCode={order.currencyCode} />
                </span>
              </div>
            ))}
          </>
        )}

        {/* Recargos: el canje de puntos del carrito llega como uno negativo. */}
        {order.surcharges?.map((surcharge) => (
          <div key={surcharge.id} className={`flex justify-between text-sm ${surcharge.priceWithTax < 0 ? 'font-medium text-primary-text' : ''}`}>
            <span>{surcharge.sku === 'LOYALTY_POINTS_DISCOUNT' ? t('loyaltyDiscount') : surcharge.description}</span>
            <span>
              <Price value={surcharge.priceWithTax} currencyCode={order.currencyCode} />
            </span>
          </div>
        ))}

        {order.couponCodes && order.couponCodes.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-brand-muted">
            <Tag className="h-3 w-3" />
            <span>{order.couponCodes.join(', ')}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-brand-muted">{t('shipping')}</span>
          <span>
            {order.shippingWithTax > 0
              ? <Price value={order.shippingWithTax} currencyCode={order.currencyCode} />
              : t('toBeCalculated')}
          </span>
        </div>
      </div>

      <Separator className="bg-brand-line" />

      <div className="flex items-baseline justify-between font-bold text-lg">
        <span>{t('total')}</span>
        <span className="font-mono text-2xl">
          <Price value={order.totalWithTax} currencyCode={order.currencyCode} />
        </span>
      </div>
      {combinedTax.map((tax, index: number) => (
        <div key={index} className="flex justify-between text-xs text-brand-muted">
          <span>{t('taxIncludedNote', {rate: tax.taxRate})}</span>
          <span>
            <Price value={tax.taxTotal} currencyCode={order.currencyCode} />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OrderSummary() {
  const t = useTranslations('Checkout');
  const { order } = useCheckout();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Móvil: resumen plegable */}
      <div className="lg:hidden">
        <Card className="border-0 bg-brand text-brand-fg ring-0">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    {t('orderSummary')} ({order.lines.length} {order.lines.length === 1 ? t('item') : t('items')})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">
                      <Price value={order.totalWithTax} currencyCode={order.currencyCode} />
                    </span>
                    <ChevronDown className={`h-5 w-5 text-brand-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <OrderSummaryContent order={order} t={t} />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Escritorio: resumen fijo siempre visible */}
      <div className="hidden lg:block">
        <Card className="border-0 bg-brand text-brand-fg ring-0 lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]">
          <CardHeader>
            <CardTitle>{t('orderSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderSummaryContent order={order} t={t} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
