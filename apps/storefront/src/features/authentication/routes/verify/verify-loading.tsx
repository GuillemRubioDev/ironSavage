import {Card, CardContent} from '@/components/ui/card';
import {Loader2} from 'lucide-react';
import {useTranslations} from 'next-intl';

/** Pantalla mientras se verifica la cuenta (fallback del servidor y estado de VerifyContent). */
export function VerifyLoading() {
    const t = useTranslations('Verify');
    return (
        <Card>
            <CardContent className="pt-6 space-y-4">
                <div className="flex justify-center">
                    <Loader2 className="h-16 w-16 text-primary animate-spin" aria-hidden="true"/>
                </div>
                <div className="space-y-2 text-center" aria-live="polite">
                    <h1 className="text-4xl">{t('verifying')}</h1>
                    <p className="text-muted-foreground">{t('verifyingMessage')}</p>
                </div>
            </CardContent>
        </Card>
    );
}
