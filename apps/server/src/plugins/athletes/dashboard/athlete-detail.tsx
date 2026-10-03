import { Trans, useLingui } from '@lingui/react/macro';
import {
    api,
    Badge,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    FullWidthPageBlock,
    Input,
    Label,
    Page,
    PageLayout,
    PageTitle,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Textarea,
} from '@vendure/dashboard';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    AthleteCodeForm,
    AthleteCodeFormValue,
    codeToFormValue,
    EMPTY_CODE_FORM,
    formatDiscount,
    formatMoney,
    formatReward,
    formValueToInput,
} from './athlete-code-form';
import {
    adjustAthletePointsDocument,
    athleteCodeOrdersDocument,
    athleteDetailDocument,
    athleteLoyaltyDocument,
    athleteRewardsDocument,
    createAthleteCodeDocument,
    removeAthleteRoleDocument,
    revertAthleteRewardDocument,
    updateAthleteCodeDocument,
    updateAthleteDocument,
} from './graphql';

const REWARDS_PAGE_SIZE = 50;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    ACTIVE: 'default',
    PARTIALLY_REVERTED: 'secondary',
    REVERTED: 'destructive',
};

export function AthleteDetailPage() {
    const { t } = useLingui();
    const { id } = useParams({ strict: false }) as { id: string };
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [confirmRemove, setConfirmRemove] = useState(false);

    const rewardStatusLabel: Record<string, string> = {
        ACTIVE: t`Active`,
        PARTIALLY_REVERTED: t`Partially reverted`,
        REVERTED: t`Reverted`,
    };
    const reversalReasonLabel: Record<string, string> = {
        ORDER_CANCELLED: t`Order cancelled`,
        REFUND: t`Refund`,
        MANUAL: t`Manual`,
    };

    const detailKey = ['athlete-detail', id];
    const { data, isLoading } = useQuery({
        queryKey: detailKey,
        queryFn: () => api.query(athleteDetailDocument, { id }),
    });
    const athlete = data?.athlete;
    const customerId = athlete?.customerId;

    const loyaltyKey = ['athlete-loyalty', customerId];
    const { data: loyaltyData } = useQuery({
        queryKey: loyaltyKey,
        queryFn: () => api.query(athleteLoyaltyDocument, { customerId: customerId! }),
        enabled: !!customerId,
    });
    const rewardsKey = ['athlete-rewards', id];
    const { data: rewardsData } = useQuery({
        queryKey: rewardsKey,
        queryFn: () => api.query(athleteRewardsDocument, { athleteId: id, options: { skip: 0, take: REWARDS_PAGE_SIZE } }),
    });

    const [enabled, setEnabled] = useState(true);
    const [notes, setNotes] = useState('');
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
    const [addingCode, setAddingCode] = useState(false);
    const [codeError, setCodeError] = useState<string | null>(null);
    const [ordersCodeId, setOrdersCodeId] = useState<string | null>(null);
    const [adjustPoints, setAdjustPoints] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [revertingId, setRevertingId] = useState<string | null>(null);
    const [revertNote, setRevertNote] = useState('');
    const [rewardError, setRewardError] = useState<string | null>(null);

    useEffect(() => {
        if (athlete) {
            setEnabled(athlete.enabled);
            setNotes(athlete.notes ?? '');
        }
    }, [athlete]);

    const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
        queryKey: ['athlete-code-orders', ordersCodeId],
        queryFn: () => api.query(athleteCodeOrdersDocument, { codeId: ordersCodeId!, options: { skip: 0, take: 50 } }),
        enabled: !!ordersCodeId,
    });

    async function refreshAll() {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: detailKey }),
            queryClient.invalidateQueries({ queryKey: loyaltyKey }),
            queryClient.invalidateQueries({ queryKey: rewardsKey }),
            queryClient.invalidateQueries({ queryKey: ['athlete-list'] }),
        ]);
    }

    const profileMutation = useMutation({
        mutationFn: () => api.mutate(updateAthleteDocument, { id, input: { enabled, notes: notes || null } }),
        onSuccess: async result => {
            const payload = result.updateAthlete;
            setProfileMessage(payload.__typename === 'Athlete' ? t`Saved.` : payload.message);
            await refreshAll();
        },
    });

    const adjustMutation = useMutation({
        mutationFn: () =>
            api.mutate(adjustAthletePointsDocument, {
                input: { customerId: customerId!, points: Number(adjustPoints), description: adjustReason },
            }),
        onSuccess: async () => {
            setAdjustPoints('');
            setAdjustReason('');
            await refreshAll();
        },
    });

    async function saveCode(codeId: string | null, value: AthleteCodeFormValue) {
        setCodeError(null);
        const input = formValueToInput(value);
        const result = codeId
            ? (await api.mutate(updateAthleteCodeDocument, { id: codeId, input })).updateAthleteCode
            : (await api.mutate(createAthleteCodeDocument, { athleteId: id, input })).createAthleteCode;
        if (result.__typename !== 'AthleteCode') {
            setCodeError(result.message);
            return;
        }
        setEditingCodeId(null);
        setAddingCode(false);
        await refreshAll();
    }

    async function removeRole() {
        const result = await api.mutate(removeAthleteRoleDocument, { id });
        if (result.removeAthleteRole) {
            await queryClient.invalidateQueries({ queryKey: ['athlete-list'] });
            await queryClient.invalidateQueries({ queryKey: ['athlete-by-customer'] });
            void navigate({ to: '/athletes' });
        }
    }

    async function revertReward(rewardId: string) {
        setRewardError(null);
        const result = (await api.mutate(revertAthleteRewardDocument, { id: rewardId, note: revertNote })).revertAthleteReward;
        if (result.__typename !== 'AthleteReward') {
            setRewardError(result.message);
            return;
        }
        setRevertingId(null);
        setRevertNote('');
        await refreshAll();
    }

    if (isLoading || !athlete) {
        return (
            <Page pageId="athlete-detail">
                <PageTitle>
                    <Trans>Athlete</Trans>
                </PageTitle>
                <PageLayout>
                    <FullWidthPageBlock blockId="loading">
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? <Trans>Loading…</Trans> : <Trans>Athlete not found.</Trans>}
                        </p>
                    </FullWidthPageBlock>
                </PageLayout>
            </Page>
        );
    }

    const account = loyaltyData?.customerLoyaltyAccount;
    const rewards = rewardsData?.athleteRewards.items ?? [];
    const orders = ordersData?.athleteCodeOrders.items ?? [];
    const ordersCode = athlete.codes.find(c => c.id === ordersCodeId);
    const canAdjust = adjustPoints.trim() !== '' && Number.isInteger(Number(adjustPoints)) && Number(adjustPoints) !== 0 && adjustReason.trim() !== '';
    const firstName = athlete.customer.firstName;
    const totalRewardPoints = athlete.stats.totalRewardPoints;
    const revertedRewardPoints = athlete.stats.revertedRewardPoints;

    return (
        <Page pageId="athlete-detail">
            <PageTitle>
                {athlete.customer.firstName} {athlete.customer.lastName}
            </PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="athlete-profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trans>Profile</Trans>
                                <Badge variant={athlete.enabled ? 'default' : 'outline'}>
                                    {athlete.enabled ? <Trans>Active</Trans> : <Trans>Disabled</Trans>}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Email</Trans>
                                    </p>
                                    <p>{athlete.customer.emailAddress}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Phone</Trans>
                                    </p>
                                    <p>{athlete.customer.phoneNumber || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Customer record</Trans>
                                    </p>
                                    <Link to="/customers/$id" params={{ id: athlete.customer.id }} className="text-primary underline">
                                        <Trans>Open customer</Trans>
                                    </Link>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                <Trans>
                                    Login, email verification and password emails are managed like for any customer, in the{' '}
                                    <Link to="/customers/$id" params={{ id: athlete.customer.id }} className="text-primary underline">
                                        customer page
                                    </Link>{' '}
                                    ("Account access").
                                </Trans>
                            </p>
                            <div className="flex items-center gap-3">
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                                <Label>
                                    <Trans>Athlete active</Trans>
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                <Trans>
                                    While disabled, the athlete's codes stop applying, no new rewards are granted, and they earn
                                    regular customer points on their own purchases again. Points already earned are kept.
                                </Trans>
                            </p>
                            <div className="space-y-1">
                                <Label htmlFor="notes">
                                    <Trans>Internal notes</Trans>
                                </Label>
                                <Textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
                                    {profileMutation.isPending ? <Trans>Saving…</Trans> : <Trans>Save profile</Trans>}
                                </Button>
                                {profileMessage && <span className="text-sm text-muted-foreground">{profileMessage}</span>}
                            </div>
                            <div className="border-t pt-4">
                                {confirmRemove ? (
                                    <div className="space-y-2">
                                        <p className="text-sm">
                                            <Trans>
                                                Remove the athlete role? {firstName} stays a regular customer (their points and reward
                                                history are kept), and all their codes stop working immediately.
                                            </Trans>
                                        </p>
                                        <div className="flex gap-2">
                                            <Button variant="destructive" size="sm" onClick={removeRole}>
                                                <Trans>Remove athlete role</Trans>
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>
                                                <Trans>Cancel</Trans>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" onClick={() => setConfirmRemove(true)}>
                                        <Trans>Remove athlete role</Trans>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>

                <FullWidthPageBlock blockId="athlete-points">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Trans>Points</Trans>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Current balance</Trans>
                                    </p>
                                    <p className="text-2xl font-bold flex items-center gap-1.5">
                                        <Star className="size-5 text-primary" fill="currentColor" />
                                        {account?.balance ?? 0}
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Reward points earned (net)</Trans>
                                    </p>
                                    <p className="text-2xl font-bold">{athlete.stats.netRewardPoints}</p>
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>
                                            {totalRewardPoints} granted · {revertedRewardPoints} reverted
                                        </Trans>
                                    </p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Rewarded orders</Trans>
                                    </p>
                                    <p className="text-2xl font-bold">{athlete.stats.rewardedOrders}</p>
                                </div>
                                <div className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground">
                                        <Trans>Points spent</Trans>
                                    </p>
                                    <p className="text-2xl font-bold">{account?.lifetimeSpent ?? 0}</p>
                                </div>
                            </div>
                            <form
                                className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
                                onSubmit={e => {
                                    e.preventDefault();
                                    if (canAdjust) adjustMutation.mutate();
                                }}
                            >
                                <div className="space-y-1">
                                    <Label htmlFor="adjust-points">
                                        <Trans>Manual adjustment (+/-)</Trans>
                                    </Label>
                                    <Input id="adjust-points" type="number" className="w-32" value={adjustPoints} onChange={e => setAdjustPoints(e.target.value)} />
                                </div>
                                <div className="space-y-1 flex-1 min-w-50">
                                    <Label htmlFor="adjust-reason">
                                        <Trans>Reason</Trans>
                                    </Label>
                                    <Input
                                        id="adjust-reason"
                                        value={adjustReason}
                                        onChange={e => setAdjustReason(e.target.value)}
                                        placeholder={t`Required — shown in the athlete's points history`}
                                    />
                                </div>
                                <Button type="submit" disabled={!canAdjust || adjustMutation.isPending}>
                                    {adjustMutation.isPending ? <Trans>Applying…</Trans> : <Trans>Apply adjustment</Trans>}
                                </Button>
                            </form>
                            {adjustMutation.error && <p className="text-sm text-destructive">{(adjustMutation.error as Error).message}</p>}
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>

                <FullWidthPageBlock blockId="athlete-codes">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <Trans>Promotional codes</Trans>
                                {!addingCode && (
                                    <Button size="sm" variant="outline" onClick={() => { setAddingCode(true); setEditingCodeId(null); }}>
                                        <Trans>Add code</Trans>
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">
                                <Trans>
                                    Changing a code's terms only affects future orders — rewards already granted keep the terms they
                                    were calculated with. Each code is applied at checkout through a Vendure promotion that is kept in
                                    sync automatically; manage it from here, not from Marketing → Promotions.
                                </Trans>
                            </p>
                            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
                            {addingCode && (
                                <AthleteCodeForm
                                    initialValue={EMPTY_CODE_FORM}
                                    submitLabel={t`Create code`}
                                    onSubmit={value => saveCode(null, value)}
                                    onCancel={() => setAddingCode(false)}
                                />
                            )}
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                <Trans>Code</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Customer discount</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Athlete reward</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Status</Trans>
                                            </TableHead>
                                            <TableHead className="text-right">
                                                <Trans>Actions</Trans>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {athlete.codes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                                                    <Trans>No codes yet.</Trans>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            athlete.codes.map(code =>
                                                editingCodeId === code.id ? (
                                                    <TableRow key={code.id}>
                                                        <TableCell colSpan={5}>
                                                            <AthleteCodeForm
                                                                initialValue={codeToFormValue(code)}
                                                                submitLabel={t`Save code`}
                                                                onSubmit={value => saveCode(code.id, value)}
                                                                onCancel={() => setEditingCodeId(null)}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    <TableRow key={code.id}>
                                                        <TableCell className="font-mono font-medium">{code.code}</TableCell>
                                                        <TableCell>{formatDiscount(code.discountType, code.discountValue)}</TableCell>
                                                        <TableCell>{formatReward(code.rewardType, code.rewardValue)}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={code.enabled && athlete.enabled ? 'default' : 'outline'}>
                                                                {!code.enabled ? (
                                                                    <Trans>Disabled</Trans>
                                                                ) : athlete.enabled ? (
                                                                    <Trans>Active</Trans>
                                                                ) : (
                                                                    <Trans>Athlete disabled</Trans>
                                                                )}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-2">
                                                            <Button size="sm" variant="outline" onClick={() => setOrdersCodeId(code.id)}>
                                                                <Trans>Orders</Trans>
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => { setEditingCodeId(code.id); setAddingCode(false); }}>
                                                                <Trans>Edit</Trans>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>

                {ordersCode && (
                    <FullWidthPageBlock blockId="athlete-code-orders">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <Trans>Orders using {ordersCode.code}</Trans>
                                    <Button size="sm" variant="ghost" onClick={() => setOrdersCodeId(null)}>
                                        <Trans>Close</Trans>
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground mb-2">
                                    <Trans>Every order the code was applied to, including unpaid or cancelled ones that produced no reward.</Trans>
                                </p>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    <Trans>Order</Trans>
                                                </TableHead>
                                                <TableHead>
                                                    <Trans>Date</Trans>
                                                </TableHead>
                                                <TableHead>
                                                    <Trans>Customer</Trans>
                                                </TableHead>
                                                <TableHead>
                                                    <Trans>State</Trans>
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <Trans>Total</Trans>
                                                </TableHead>
                                                <TableHead>
                                                    <Trans>Reward</Trans>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoadingOrders ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                                                        <Trans>Loading…</Trans>
                                                    </TableCell>
                                                </TableRow>
                                            ) : orders.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                                                        <Trans>No orders have used this code yet.</Trans>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                orders.map(order => {
                                                    const reward = rewards.find(r => r.orderId === order.id);
                                                    const rewardPoints = reward ? reward.points - reward.revertedPoints : 0;
                                                    return (
                                                        <TableRow key={order.id}>
                                                            <TableCell>
                                                                <Link to="/orders/$id" params={{ id: order.id }} className="text-primary underline">
                                                                    {order.code}
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {new Date(order.orderPlacedAt ?? order.createdAt).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell>
                                                                {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary">{order.state}</Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatMoney(order.totalWithTax, order.currencyCode)}</TableCell>
                                                            <TableCell>{reward ? t`${rewardPoints} pts` : '—'}</TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </FullWidthPageBlock>
                )}

                <FullWidthPageBlock blockId="athlete-rewards">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Trans>Reward history</Trans>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {rewardError && <p className="text-sm text-destructive">{rewardError}</p>}
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                <Trans>Date</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Order</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Code</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Customer</Trans>
                                            </TableHead>
                                            <TableHead className="text-right">
                                                <Trans>Base</Trans>
                                            </TableHead>
                                            <TableHead className="text-right">
                                                <Trans>Customer discount</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Rule applied</Trans>
                                            </TableHead>
                                            <TableHead className="text-right">
                                                <Trans>Points</Trans>
                                            </TableHead>
                                            <TableHead>
                                                <Trans>Status</Trans>
                                            </TableHead>
                                            <TableHead className="text-right">
                                                <Trans>Actions</Trans>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rewards.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="h-16 text-center text-muted-foreground">
                                                    <Trans>No rewards yet.</Trans>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rewards.map(reward => {
                                                const pointValue = reward.pointValueInCents;
                                                const revertedPoints = reward.revertedPoints;
                                                const unrecoveredPoints = reward.unrecoveredPoints;
                                                return (
                                                    <TableRow key={reward.id}>
                                                        <TableCell className="text-muted-foreground">{new Date(reward.createdAt).toLocaleString()}</TableCell>
                                                        <TableCell>
                                                            <Link to="/orders/$id" params={{ id: reward.orderId }} className="text-primary underline">
                                                                {reward.orderCode}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="font-mono">{reward.code}</TableCell>
                                                        <TableCell>
                                                            {reward.customer ? (
                                                                <Link to="/customers/$id" params={{ id: reward.customer.id }} className="underline">
                                                                    {reward.customer.firstName} {reward.customer.lastName}
                                                                </Link>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">{formatMoney(reward.baseAmount, reward.currencyCode)}</TableCell>
                                                        <TableCell className="text-right">{formatMoney(reward.customerDiscountAmount, reward.currencyCode)}</TableCell>
                                                        <TableCell className="text-xs">
                                                            {formatReward(reward.rewardType, reward.rewardValue)}
                                                            {reward.rewardType === 'PERCENTAGE' && ` · ${t`1 pt = ${pointValue}¢`}`}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            +{reward.points}
                                                            {revertedPoints > 0 && (
                                                                <span className="block text-xs text-destructive">
                                                                    <Trans>−{revertedPoints} reverted</Trans>
                                                                    {unrecoveredPoints > 0 && ` ${t`(${unrecoveredPoints} already spent)`}`}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={STATUS_VARIANT[reward.status] ?? 'secondary'}>
                                                                {rewardStatusLabel[reward.status] ?? reward.status}
                                                            </Badge>
                                                            {reward.reversals.map(r => (
                                                                <p key={r.id} className="text-xs text-muted-foreground mt-1">
                                                                    {new Date(r.createdAt).toLocaleDateString()} · {reversalReasonLabel[r.reason] ?? r.reason} · −{r.points}
                                                                    {r.note ? ` · ${r.note}` : ''}
                                                                </p>
                                                            ))}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {reward.revertedPoints < reward.points &&
                                                                (revertingId === reward.id ? (
                                                                    <div className="flex flex-col gap-2 items-end">
                                                                        <Input
                                                                            value={revertNote}
                                                                            onChange={e => setRevertNote(e.target.value)}
                                                                            placeholder={t`Reason (required)`}
                                                                            className="w-48"
                                                                        />
                                                                        <div className="flex gap-2">
                                                                            <Button size="sm" variant="destructive" disabled={!revertNote.trim()} onClick={() => revertReward(reward.id)}>
                                                                                <Trans>Confirm</Trans>
                                                                            </Button>
                                                                            <Button size="sm" variant="outline" onClick={() => setRevertingId(null)}>
                                                                                <Trans>Cancel</Trans>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <Button size="sm" variant="outline" onClick={() => { setRevertingId(reward.id); setRevertNote(''); }}>
                                                                        <Trans>Revert</Trans>
                                                                    </Button>
                                                                ))}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                <Trans>
                                    Rewards are granted when payment settles, and reverted automatically when the order is cancelled or
                                    refunded (proportionally for partial refunds).
                                </Trans>
                            </p>
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}
