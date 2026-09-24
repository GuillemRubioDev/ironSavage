import type {Metadata} from 'next';
import {query} from '@/platform/vendure/api';
import {GetMyLoyaltyQuery} from '@/features/loyalty/graphql';
import {getActiveCustomer} from '@/features/account/customer';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {formatDate} from '@/platform/i18n/format';
import {redirect} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';
import {Star, TrendingUp, TrendingDown} from 'lucide-react';

const HISTORY_PAGE_SIZE = 50;

type PointsTypeLabelKey = 'pointsTypeEarn' | 'pointsTypeSpend' | 'pointsTypeRefund' | 'pointsTypeAdjustment' | 'pointsTypeExpire';

const TYPE_LABEL_KEYS: Record<string, PointsTypeLabelKey> = {
    EARN: 'pointsTypeEarn',
    SPEND: 'pointsTypeSpend',
    REFUND: 'pointsTypeRefund',
    ADJUSTMENT: 'pointsTypeAdjustment',
    EXPIRE: 'pointsTypeExpire',
};

function typeLabelKey(type: string): PointsTypeLabelKey {
    return TYPE_LABEL_KEYS[type] ?? 'pointsTypeAdjustment';
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Loyalty'});
    return {
        title: t('pointsPageTitle'),
    };
}

export default async function PointsPage() {
    const locale = await getRouteLocale();
    const customer = await getActiveCustomer();

    if (!customer) {
        return redirect({href: '/login', locale});
    }

    const {data} = await query(
        GetMyLoyaltyQuery,
        {options: {skip: 0, take: HISTORY_PAGE_SIZE}},
        {useAuthToken: true},
    );
    const t = await getTranslations({locale, namespace: 'Loyalty'});
    // date/status are generic "my stuff" table vocabulary shared with the
    // account feature's own orders table — genuinely reused, not
    // loyalty-owned content.
    const tAccount = await getTranslations({locale, namespace: 'Account'});

    const balance = data.loyaltyAccount?.balance ?? 0;
    const lifetimeEarned = data.loyaltyAccount?.lifetimeEarned ?? 0;
    const lifetimeSpent = data.loyaltyAccount?.lifetimeSpent ?? 0;
    const history = data.loyaltyHistory.items;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">{t('myPoints')}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('currentBalance')}</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{balance}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('pointsLifetimeEarned')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{lifetimeEarned}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('pointsLifetimeSpent')}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{lifetimeSpent}</div>
                    </CardContent>
                </Card>
            </div>

            <h2 className="text-xl font-semibold mb-4">{t('pointsHistory')}</h2>

            {history.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{t('noPointsHistory')}</p>
                </div>
            ) : (
                <>
                    {/* Mobile: Card-based layout */}
                    <div className="md:hidden space-y-3">
                        {history.map((tx) => (
                            <div key={tx.id} className="border rounded-xl p-4 bg-card">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="secondary">{t(typeLabelKey(tx.type))}</Badge>
                                    <span className={`font-semibold ${tx.points >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                        {tx.points >= 0 ? '+' : ''}{tx.points}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{tx.description}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatDate(tx.createdAt, 'short', locale)}</p>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <div className="hidden md:block border rounded-lg">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead>{tAccount('date')}</TableHead>
                                    <TableHead>{tAccount('status')}</TableHead>
                                    <TableHead>{t('pointsDescription')}</TableHead>
                                    <TableHead className="text-right">{t('pointsAmount')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((tx) => (
                                    <TableRow key={tx.id} className="hover:bg-muted/50">
                                        <TableCell>{formatDate(tx.createdAt, 'short', locale)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{t(typeLabelKey(tx.type))}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{tx.description}</TableCell>
                                        <TableCell className={`text-right font-medium ${tx.points >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                            {tx.points >= 0 ? '+' : ''}{tx.points}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}
