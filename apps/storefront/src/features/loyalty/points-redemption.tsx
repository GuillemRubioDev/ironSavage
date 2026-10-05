'use client';

import {useState, useTransition} from 'react';
import {Star} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {Button} from '@/components/ui/button';
import {Price} from '@/features/pricing/price';
import {cancelRedemption, redeemPoints} from '@/features/loyalty/redeem-actions';

/**
 * Canje de puntos Iron Rewards en el resumen del carrito (solo se monta con sesión).
 * Ofrece hasta el máximo que el servidor aceptaría; con un canje aplicado muestra los
 * puntos usados y permite quitarlo.
 */
export function PointsRedemption({balance, minPoints, maxPoints, pointValueInCents, currencyCode, applied}: {
    balance: number;
    minPoints: number;
    maxPoints: number;
    pointValueInCents: number;
    currencyCode: string;
    applied: {points: number; amount: number} | null;
}) {
    const t = useTranslations('Loyalty.redeem');
    const [points, setPoints] = useState(maxPoints);
    const [pending, startTransition] = useTransition();

    if (applied) {
        return (
            <div className="rounded-md border border-brand-line p-3 text-sm">
                <p className="flex items-center gap-2">
                    <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" />
                    {t('applied', {points: applied.points})}
                </p>
                <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    className="mt-2"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                        const result = await cancelRedemption();
                        if (!result.success) toast.error(t('errors.generic'));
                    })}
                >
                    {t('remove')}
                </Button>
            </div>
        );
    }

    if (maxPoints < minPoints) {
        return (
            <p className="rounded-md border border-brand-line p-3 text-xs text-brand-muted">
                {t('available', {balance})} · {t('minimum', {min: minPoints})}
            </p>
        );
    }

    const value = Math.min(Math.max(points, minPoints), maxPoints);

    return (
        <form
            className="rounded-md border border-brand-line p-3 text-sm"
            onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                    const result = await redeemPoints(value);
                    if (!result.success) toast.error(result.error);
                });
            }}
        >
            <p className="flex items-center gap-2 font-semibold">
                <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" />
                {t('title')}
            </p>
            <p className="mt-1 text-xs text-brand-muted">{t('available', {balance})}</p>
            <div className="mt-3 flex items-center gap-2">
                <label className="sr-only" htmlFor="redeem-points">{t('title')}</label>
                <input
                    id="redeem-points"
                    type="number"
                    inputMode="numeric"
                    min={minPoints}
                    max={maxPoints}
                    step={1}
                    value={value}
                    onChange={(event) => setPoints(Number(event.target.value) || minPoints)}
                    className="h-9 w-24 rounded-md border border-brand-line bg-transparent px-2 font-mono text-brand-fg"
                />
                <span className="text-xs text-brand-muted">
                    {t('equals')} <Price value={value * pointValueInCents} currencyCode={currencyCode} />
                </span>
                <Button type="submit" size="sm" className="ml-auto" disabled={pending}>{t('apply')}</Button>
            </div>
        </form>
    );
}
