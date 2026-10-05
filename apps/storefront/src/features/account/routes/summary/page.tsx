import type {Metadata} from 'next';
import {FileText, MapPin, Package, Star, User} from 'lucide-react';
import {getTranslations} from 'next-intl/server';
import {Button} from '@/components/ui/button';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {formatDate} from '@/platform/i18n/format';
import {toIntlLocale} from '@/platform/i18n/locale-utils';
import {query} from '@/platform/vendure/api';
import {getActiveCustomer} from '@/features/account/customer';
import {GetCustomerOrdersQuery, GetLastPaidOrderQuery} from '@/features/account/graphql';
import {loyaltyProgress, PAID_ORDER_STATES} from '@/features/account/account-summary';
import {RepeatLastOrderButton} from '@/features/account/components/repeat-last-order-button';
import {GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {getLoyaltyProgramConfig} from '@/features/loyalty/program-config';
import {OrderStatusBadge} from '@/features/orders/order-status-badge';
import {Price} from '@/features/pricing/price';

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});
    return {title: t('overview.title')};
}

/**
 * Resumen de la cuenta: saludo, Iron Rewards con barra, último pedido, accesos rápidos
 * (con "Repetir último pedido" si hay un pedido pagado) y pedidos recientes. Va dentro
 * del layout de la cuenta, que ya exige sesión (RequireCustomer).
 */
export default async function AccountSummaryPage() {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Account'});

    const [customer, ordersResult, lastPaidResult, loyaltyResult, config] = await Promise.all([
        getActiveCustomer(),
        query(GetCustomerOrdersQuery, {options: {take: 5, sort: {orderPlacedAt: 'DESC'}, filter: {state: {notEq: 'AddingItems'}}}}, {useAuthToken: true}).catch(() => null),
        query(GetLastPaidOrderQuery, {states: PAID_ORDER_STATES}, {useAuthToken: true}).catch(() => null),
        query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true}).catch(() => null),
        getLoyaltyProgramConfig().catch(() => null),
    ]);

    const orders = ordersResult?.data.activeCustomer?.orders.items ?? [];
    const lastOrder = orders[0] ?? null;
    const lastPaid = lastPaidResult?.data.activeCustomer?.orders.items[0] ?? null;
    const balance = loyaltyResult?.data.loyaltyAccount?.balance ?? 0;
    const progress = config ? loyaltyProgress({balance, ...config}) : null;
    const currencyCode = lastOrder?.currencyCode ?? 'EUR';

    const quickLinks = [
        {href: '/mi-cuenta/pedidos', icon: Package, label: t('orders')},
        {href: '/mi-cuenta/facturas', icon: FileText, label: t('invoices')},
        {href: '/mi-cuenta/puntos', icon: Star, label: t('points')},
        {href: '/mi-cuenta/addresses', icon: MapPin, label: t('addresses')},
        {href: '/mi-cuenta/profile', icon: User, label: t('profile')},
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-5xl md:text-6xl">{t('overview.greeting', {name: customer?.firstName || ''})}</h1>
                <p className="mt-2 text-muted-foreground">{t('overview.intro')}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                {progress && (
                    <section className="rounded-lg bg-brand p-6 text-brand-fg">
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-brand-muted">
                            <Star className="size-4 text-primary-text" fill="currentColor" aria-hidden="true" /> Iron Rewards
                        </p>
                        <p className="mt-2 font-display text-5xl font-black italic leading-none">{t('overview.pointsBalance', {points: balance})}</p>
                        <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={progress.percent}
                            aria-label={t('overview.progressLabel')}
                            className="mt-4 h-2 rounded-full bg-white/10"
                        >
                            <div className="h-2 rounded-full bg-primary-solid" style={{width: `${progress.percent}%`}} />
                        </div>
                        <p className="mt-2 text-sm text-brand-muted">
                            {progress.canRedeem
                                ? t('overview.canRedeem', {amount: new Intl.NumberFormat(toIntlLocale(locale), {style: 'currency', currency: currencyCode}).format(progress.redeemableCents / 100)})
                                : t('overview.toFirstRedeem', {remaining: progress.remaining})}
                        </p>
                        <Link href="/mi-cuenta/puntos" className="mt-4 inline-block text-sm font-semibold text-primary-text underline-offset-4 hover:underline">{t('overview.viewPoints')}</Link>
                    </section>
                )}

                <section className="rounded-lg border border-border p-6">
                    <h2 className="text-2xl">{t('overview.lastOrder')}</h2>
                    {lastOrder ? (
                        <div className="mt-3 space-y-2 text-sm">
                            <p className="flex flex-wrap items-center gap-3">
                                <span className="font-mono font-semibold">{lastOrder.code}</span>
                                <OrderStatusBadge state={lastOrder.state} />
                            </p>
                            <p className="text-muted-foreground">{formatDate(lastOrder.createdAt, 'long', locale)} · <Price value={lastOrder.totalWithTax} currencyCode={lastOrder.currencyCode} /></p>
                            <Link href={`/mi-cuenta/pedidos/${lastOrder.code}`} className="inline-block font-semibold text-primary underline-offset-4 hover:underline">{t('overview.viewOrder')}</Link>
                        </div>
                    ) : (
                        <div className="mt-3 space-y-3 text-sm">
                            <p className="text-muted-foreground">{t('noOrders')}</p>
                            <Button render={<Link href="/productos" />} nativeButton={false}>{t('overview.startShopping')}</Button>
                        </div>
                    )}
                </section>
            </div>

            <section>
                <h2 className="mb-3 text-2xl">{t('overview.quickAccess')}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {lastPaid && <RepeatLastOrderButton />}
                    {quickLinks.map(({href, icon: Icon, label}) => (
                        <Link key={href} href={href} className="hover-lift flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-sm font-semibold transition-colors hover:border-foreground">
                            <Icon className="size-5 text-primary-solid" aria-hidden="true" />
                            {label}
                        </Link>
                    ))}
                </div>
            </section>

            {orders.length > 0 && (
                <section>
                    <div className="mb-3 flex items-end justify-between">
                        <h2 className="text-2xl">{t('overview.recentOrders')}</h2>
                        <Link href="/mi-cuenta/pedidos" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">{t('overview.viewAllOrders')}</Link>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                    <th scope="col" className="px-4 py-3">{t('orderNumber')}</th>
                                    <th scope="col" className="px-4 py-3">{t('date')}</th>
                                    <th scope="col" className="px-4 py-3">{t('status')}</th>
                                    <th scope="col" className="px-4 py-3 text-right">{t('totalHeader')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-t border-border">
                                        <td className="px-4 py-3"><Link href={`/mi-cuenta/pedidos/${order.code}`} className="font-mono font-semibold hover:text-primary">{order.code}</Link></td>
                                        <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt, 'short', locale)}</td>
                                        <td className="px-4 py-3"><OrderStatusBadge state={order.state} /></td>
                                        <td className="px-4 py-3 text-right font-mono"><Price value={order.totalWithTax} currencyCode={order.currencyCode} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
