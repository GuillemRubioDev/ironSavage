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
    // Se guarda el texto tal cual (escribir "500" pasa por "5" y "50") y se valida al enviar.
    const [points, setPoints] = useState(String(maxPoints));
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

    const parsed = Number(points);
    const valid = Number.isInteger(parsed) && parsed >= minPoints && parsed <= maxPoints;

    return (
        <form
            className="rounded-md border border-brand-line p-3 text-sm"
            onSubmit={(event) => {
                event.preventDefault();
                startTransition(async () => {
                    if (!valid) return;
                    const result = await redeemPoints(parsed);
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
                    value={points}
                    onChange={(event) => setPoints(event.target.value)}
                    aria-invalid={!valid}
                    aria-describedby="redeem-range"
                    className="h-9 w-24 rounded-md border border-brand-line bg-transparent px-2 font-mono text-brand-fg"
                />
                <span id="redeem-range" className="text-xs text-brand-muted">
                    {valid ? <>{t('equals')} <Price value={parsed * pointValueInCents} currencyCode={currencyCode} /></> : t('range', {min: minPoints, max: maxPoints})}
                </span>
                <Button type="submit" size="sm" className="ml-auto" disabled={pending || !valid}>{t('apply')}</Button>
            </div>
        </form>
    );
}
