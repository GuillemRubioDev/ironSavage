import {Truck} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';
import {Price} from '@/features/pricing/price';
import type {FreeShippingProgress} from '@/features/cart/free-shipping-progress';

/**
 * "Te faltan X € para el envío gratis" con su barra de progreso (o "¡Tienes el envío
 * gratis!" al llegar). `tone="brand"` para el resumen oscuro del carrito.
 */
export function FreeShippingBar({progress, currencyCode, tone = 'default'}: {
    progress: FreeShippingProgress;
    currencyCode: string;
    tone?: 'default' | 'brand';
}) {
    const t = useTranslations('Cart');
    return (
        <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
                <Truck className={cn('size-4 shrink-0', progress.reached ? 'text-success' : 'text-primary-solid', tone === 'brand' && !progress.reached && 'text-primary-text')} aria-hidden="true" />
                <span>
                    {progress.reached
                        ? t('freeShippingReached')
                        : t.rich('freeShippingRemaining', {
                            amount: () => <strong className="font-mono"><Price value={progress.remainingWithTax} currencyCode={currencyCode} /></strong>,
                        })}
                </span>
            </p>
            <div
                role="progressbar"
                aria-label={t('freeShippingProgress')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                className={cn('h-1.5 overflow-hidden rounded-full', tone === 'brand' ? 'bg-white/15' : 'bg-muted')}
            >
                <div
                    className={cn('animate-bar-fill h-full origin-left rounded-full transition-[width] duration-500 motion-reduce:transition-none', progress.reached ? 'bg-success' : 'bg-primary-solid')}
                    style={{width: `${progress.percent}%`}}
                />
            </div>
        </div>
    );
}
