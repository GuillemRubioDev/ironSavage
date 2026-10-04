import type {CSSProperties} from 'react';
import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {toIntlLocale} from '@/platform/i18n/locale-utils';
import {getActiveCustomer} from '@/features/account/customer';
import {query} from '@/platform/vendure/api';
import {GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {getLoyaltyProgramConfig} from '@/features/loyalty/program-config';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {Star} from 'lucide-react';

/**
 * Bloque Iron Rewards de la portada. Las cifras (puntos por euro, mínimo canjeable y
 * tope por pedido) se leen de la configuración real del programa, nunca a mano: si
 * cambia LoyaltyPlugin.init en el servidor, cambia aquí. Los importes van en euros
 * porque el servidor guarda el valor del punto y el tope en céntimos de euro.
 */
export async function LoyaltyTeaser() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Loyalty.teaser'});
    const [customer, config] = await Promise.all([getActiveCustomer(), getLoyaltyProgramConfig()]);

    let balance: number | null = null;
    if (customer) {
        // take: 0: este aviso solo necesita el saldo, no las filas del historial.
        const {data} = await query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true});
        balance = data.loyaltyAccount?.balance ?? 0;
    }

    const euros = new Intl.NumberFormat(toIntlLocale(locale), {style: 'currency', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 0});
    const stats = [
        {value: String(config.pointsPerEuro), label: t('stats.earn')},
        {value: String(config.minRedeemablePoints), label: t('stats.redeem', {amount: euros.format((config.minRedeemablePoints * config.pointValueInCents) / 100)})},
        {value: euros.format(config.maxDiscountPerOrderCents / 100), label: t('stats.cap')},
    ];

    return (
        <section className="relative overflow-hidden bg-brand py-16 text-brand-fg md:py-24">
            <Star
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 top-1/2 size-64 -translate-y-1/2 text-primary-solid/10 md:size-96"
                fill="currentColor"
                strokeWidth={0}
            />
            <div className="container relative mx-auto grid items-center gap-10 px-4 lg:grid-cols-2">
                <div className="max-w-xl">
                    <h2 className="text-5xl md:text-6xl">
                        {t('titleLead')} <span className="text-primary-text">{t('titleHighlight')}</span>
                    </h2>
                    <p className="mt-4 leading-relaxed text-brand-muted">
                        {customer ? t('description') : t('guestDescription')}
                    </p>
                    {customer && balance !== null && (
                        <p className="mt-4 text-sm text-brand-muted">
                            {t('balanceLabel')}: <span className="font-mono text-2xl font-bold text-primary-text">{balance}</span> {t('pointsSuffix')}
                        </p>
                    )}
                    <Button render={<Link href={customer ? '/mi-cuenta/puntos' : '/registro'} />} nativeButton={false} size="xl" className="mt-6">
                        {customer ? t('cta') : t('signedOutCta')}
                    </Button>
                </div>
                <ul className="stagger grid grid-cols-3 gap-3">
                    {stats.map((stat, i) => (
                        <li key={stat.label} style={{'--i': i} as CSSProperties} className="rounded-lg border border-brand-line bg-brand-surface p-4">
                            <span className="block font-display text-4xl font-black italic leading-none text-primary-text md:text-5xl">{stat.value}</span>
                            <span className="mt-2 block text-xs text-brand-muted">{stat.label}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
