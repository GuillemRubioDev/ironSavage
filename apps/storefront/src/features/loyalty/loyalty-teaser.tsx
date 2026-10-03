import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {getActiveCustomer} from '@/features/account/customer';
import {query} from '@/platform/vendure/api';
import {GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {Star} from 'lucide-react';

export async function LoyaltyTeaser() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Loyalty.teaser'});
    const customer = await getActiveCustomer();

    let balance: number | null = null;
    if (customer) {
        // take: 0: este aviso solo necesita el saldo, no las filas del historial.
        const {data} = await query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true});
        balance = data.loyaltyAccount?.balance ?? 0;
    }

    return (
        <section className="relative overflow-hidden bg-[oklch(0.13_0.004_260)] py-16 md:py-24">
            <Star
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 top-1/2 size-64 md:size-96 -translate-y-1/2 text-primary/10"
                fill="currentColor"
                strokeWidth={0}
            />
            <div className="container relative mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                    <div className="max-w-xl">
                        <h2 className="text-display text-3xl md:text-5xl font-bold text-white">{t('title')}</h2>
                        <p className="mt-3 text-white/60 leading-relaxed">
                            {customer ? t('description') : t('guestDescription')}
                        </p>
                        {customer && balance !== null && (
                            <p className="mt-4 text-sm text-white/60">
                                {t('balanceLabel')}: <span className="font-mono text-primary font-bold text-2xl tabular-nums">{balance}</span> {t('pointsSuffix')}
                            </p>
                        )}
                    </div>
                    <Button render={<Link href={customer ? '/mi-cuenta/puntos' : '/registro'} />} nativeButton={false} size="lg" className="shrink-0">
                        {customer ? t('cta') : t('signedOutCta')}
                    </Button>
                </div>
            </div>
        </section>
    );
}
