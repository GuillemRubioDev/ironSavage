'use client';

import {useTransition} from 'react';
import {Button} from '@/components/ui/button';
import {Minus, Plus, X, Loader2} from 'lucide-react';
import {toast} from 'sonner';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/platform/i18n/navigation';
import {adjustQuantity, removeFromCart} from './actions';

interface QuantityControlProps {
    lineId: string;
    quantity: number;
}

export function QuantityControl({lineId, quantity}: QuantityControlProps) {
    const t = useTranslations('Cart');
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleAdjust = (newQuantity: number) => {
        startTransition(async () => {
            const result = await adjustQuantity(lineId, newQuantity);
            if (!result.success) {
                toast.error(t('updateError'), {description: result.error});
            } else {
                router.refresh();
            }
        });
    };

    const handleRemove = () => {
        startTransition(async () => {
            const result = await removeFromCart(lineId);
            if (!result.success) {
                toast.error(t('removeError'), {description: result.error});
            } else {
                router.refresh();
            }
        });
    };

    return (
        <>
            <div className="flex items-center gap-1 border rounded-full bg-muted/50">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full transition-all duration-200 hover:bg-background"
                    disabled={quantity <= 1 || isPending}
                    onClick={() => handleAdjust(Math.max(1, quantity - 1))}
                >
                    <Minus className="h-4 w-4"/>
                </Button>

                <span className="w-10 text-center font-semibold tabular-nums transition-all duration-200">
                    {isPending ? <Loader2 className="h-4 w-4 mx-auto animate-spin"/> : quantity}
                </span>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full transition-all duration-200 hover:bg-background"
                    disabled={isPending}
                    onClick={() => handleAdjust(quantity + 1)}
                >
                    <Plus className="h-4 w-4"/>
                </Button>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                disabled={isPending}
                onClick={handleRemove}
            >
                <X className="h-5 w-5"/>
            </Button>
        </>
    );
}
