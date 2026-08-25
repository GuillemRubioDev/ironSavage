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
    const t = await getTranslations({locale, namespace: 'Home.loyalty'});
    const customer = await getActiveCustomer();

    let balance: number | null = null;
    if (customer) {
        // take: 0 — this teaser only needs the running balance, not history rows.
        const {data} = await query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true});
        balance = data.loyaltyAccount?.balance ?? 0;
    }

    return (
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="flex size-16 md:size-20 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Star className="size-8 md:size-10 text-primary" fill="currentColor" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight">{t('title')}</h2>
                        <p className="mt-2 text-muted-foreground leading-relaxed max-w-xl">
                            {customer ? t('description') : t('guestDescription')}
                        </p>
                        {customer && balance !== null && (
                            <p className="mt-3 text-sm text-muted-foreground">
                                {t('balanceLabel')}: <span className="text-primary font-display font-bold text-lg">{balance}</span> {t('pointsSuffix')}
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
