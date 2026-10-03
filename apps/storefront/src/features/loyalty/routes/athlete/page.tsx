import type {Metadata} from 'next';
import {query} from '@/platform/vendure/api';
import {GetMyAthleteRewardsQuery, GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {getMyAthleteProfile} from '@/features/loyalty/athlete';
import {getActiveCustomer} from '@/features/account/customer';
import {Price} from '@/features/pricing/price';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {formatDate} from '@/platform/i18n/format';
import {redirect} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {Star, Trophy, ShoppingBag, Tag} from 'lucide-react';

const HISTORY_PAGE_SIZE = 50;

type StatusKey = 'statusActive' | 'statusPartiallyReverted' | 'statusReverted';

const STATUS_KEYS: Record<string, StatusKey> = {
    ACTIVE: 'statusActive',
    PARTIALLY_REVERTED: 'statusPartiallyReverted',
    REVERTED: 'statusReverted',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
    ACTIVE: 'default',
    PARTIALLY_REVERTED: 'secondary',
    REVERTED: 'destructive',
};

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Loyalty.athlete'});
    return {
        title: t('pageTitle'),
    };
}

export default async function AthletePage() {
    const locale = await getRouteLocale();
    const customer = await getActiveCustomer();

    if (!customer) {
        return redirect({href: '/login', locale});
    }

    const profile = await getMyAthleteProfile();
    if (!profile) {
        // Los clientes normales no tienen sección de atleta: se les manda a sus puntos.
        return redirect({href: '/mi-cuenta/puntos', locale});
    }

    const [{data: rewardsData}, {data: loyaltyData}] = await Promise.all([
        query(GetMyAthleteRewardsQuery, {options: {skip: 0, take: HISTORY_PAGE_SIZE}}, {useAuthToken: true}),
        // take: 0: aquí solo hace falta el saldo.
        query(GetMyLoyaltyQuery, {options: {skip: 0, take: 0}}, {useAuthToken: true}),
    ]);
    const t = await getTranslations({locale, namespace: 'Loyalty.athlete'});
    const tAccount = await getTranslations({locale, namespace: 'Account'});

    const balance = loyaltyData.loyaltyAccount?.balance ?? 0;
    const rewards = rewardsData.myAthleteRewards.items;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
            <p className="text-muted-foreground mb-6 max-w-2xl">{t('intro')}</p>

            {!profile.enabled && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 mb-6 text-sm">
                    {t('disabledNotice')}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('availablePoints')}</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{balance}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('netRewardPoints')}</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{profile.netRewardPoints}</div>
                        {profile.revertedRewardPoints > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('revertedHint', {reverted: profile.revertedRewardPoints})}
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('rewardedOrders')}</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{profile.rewardedOrders}</div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold mb-4">{t('myCodes')}</h2>
            {profile.codes.length === 0 ? (
                <p className="text-muted-foreground mb-8">{t('noCodes')}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {profile.codes.map((code) => (
                        <div key={code.code} className="border rounded-xl p-4 bg-card">
                            <div className="flex items-center justify-between mb-3">
                                <span className="flex items-center gap-2 font-mono text-lg font-semibold">
                                    <Tag className="h-4 w-4 text-primary"/>
                                    {code.code}
                                </span>
                                <Badge variant={code.enabled ? 'default' : 'secondary'}>
                                    {code.enabled ? t('codeActive') : t('codeInactive')}
                                </Badge>
                            </div>
                            <dl className="grid grid-cols-2 gap-2 text-sm">
                                <dt className="text-muted-foreground">{t('customerDiscount')}</dt>
                                <dd className="text-right font-medium">
                                    {code.discountType === 'FIXED_AMOUNT'
                                        ? <Price value={code.discountValue} currencyCode="EUR"/>
                                        : `${code.discountValue}%`}
                                </dd>
                                <dt className="text-muted-foreground">{t('yourReward')}</dt>
                                <dd className="text-right font-medium">
                                    {code.rewardType === 'FIXED_POINTS'
                                        ? t('rewardFixed', {value: code.rewardValue})
                                        : t('rewardPercentage', {value: code.rewardValue})}
                                </dd>
                            </dl>
                        </div>
                    ))}
                </div>
            )}

            <h2 className="text-xl font-semibold mb-4">{t('rewardsHistory')}</h2>
            {rewards.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('noRewards')}</p>
                </div>
            ) : (
                <>
                    {/* Móvil: diseño en tarjetas */}
                    <div className="md:hidden space-y-3">
                        {rewards.map((reward) => (
                            <div key={reward.id} className="border rounded-xl p-4 bg-card">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant={STATUS_VARIANTS[reward.status] ?? 'secondary'}>
                                        {t(STATUS_KEYS[reward.status] ?? 'statusActive')}
                                    </Badge>
                                    <span className="font-semibold text-primary">+{reward.points}</span>
                                </div>
                                <p className="text-sm">
                                    {t('order')} {reward.orderCode} · <Price value={reward.baseAmount} currencyCode={reward.currencyCode}/>
                                </p>
                                {reward.revertedPoints > 0 && (
                                    <p className="text-xs text-destructive">{t('revertedPoints', {points: reward.revertedPoints})}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(reward.createdAt, 'short', locale)} · {reward.code}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Escritorio: diseño en tabla */}
                    <div className="hidden md:block border rounded-lg">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead>{tAccount('date')}</TableHead>
                                    <TableHead>{t('order')}</TableHead>
                                    <TableHead>{t('code')}</TableHead>
                                    <TableHead className="text-right">{t('base')}</TableHead>
                                    <TableHead className="text-right">{t('points')}</TableHead>
                                    <TableHead>{t('status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rewards.map((reward) => (
                                    <TableRow key={reward.id} className="hover:bg-muted/50">
                                        <TableCell>{formatDate(reward.createdAt, 'short', locale)}</TableCell>
                                        <TableCell className="font-mono text-sm">{reward.orderCode}</TableCell>
                                        <TableCell className="font-mono text-sm">{reward.code}</TableCell>
                                        <TableCell className="text-right">
                                            <Price value={reward.baseAmount} currencyCode={reward.currencyCode}/>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-primary">
                                            +{reward.points}
                                            {reward.revertedPoints > 0 && (
                                                <span className="block text-xs font-normal text-destructive">
                                                    {t('revertedPoints', {points: reward.revertedPoints})}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANTS[reward.status] ?? 'secondary'}>
                                                {t(STATUS_KEYS[reward.status] ?? 'statusActive')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
            <p className="text-xs text-muted-foreground mt-4">{t('footnote')}</p>
        </div>
    );
}
