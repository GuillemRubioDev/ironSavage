'use client';

import {useActionState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Tag} from 'lucide-react';
import {applyPromotionCode, removePromotionCode, type CartActionResult} from './actions';
import {useTranslations} from 'next-intl';

type ActiveOrder = {
    id: string;
    couponCodes?: string[] | null;
};

export function PromotionCode({activeOrder}: { activeOrder: ActiveOrder }) {
    const t = useTranslations('Cart');
    const [state, formAction, isPending] = useActionState<CartActionResult | undefined, FormData>(
        applyPromotionCode,
        undefined,
    );

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5"/>
                    {t('promotionCode')}
                </CardTitle>
                <CardDescription>
                    {t('enterDiscountCode')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {activeOrder.couponCodes && activeOrder.couponCodes.length > 0 ? (
                    <div className="space-y-2">
                        {activeOrder.couponCodes.map((code) => (
                            <div key={code}
                                 className="flex items-center justify-between p-3 border border-primary/20 rounded-md bg-primary/5">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4 text-primary"/>
                                    <span className="font-medium text-sm">{code}</span>
                                </div>
                                <form action={removePromotionCode}>
                                    <input type="hidden" name="code" value={code}/>
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        {t('remove')}
                                    </Button>
                                </form>
                            </div>
                        ))}
                    </div>
                ) : (
                    <form action={formAction} className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="text"
                                name="code"
                                placeholder={t('enterCode')}
                                className="flex-1"
                                required
                                disabled={isPending}
                            />
                            <Button type="submit" disabled={isPending}>
                                {isPending ? t('applying') : t('apply')}
                            </Button>
                        </div>
                        {state?.success === false && state.error && (
                            <p className="text-sm text-destructive">{state.error}</p>
                        )}
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
