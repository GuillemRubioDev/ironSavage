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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@vendure/dashboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Star } from 'lucide-react';
import { useState } from 'react';

import { adjustLoyaltyPointsDocument, customerLoyaltyDocument, searchCustomersDocument } from './graphql';

const HISTORY_PAGE_SIZE = 20;

/**
 * Simple, single-screen loyalty admin: search a customer, view balance +
 * history (both via the already-existing customerLoyaltyAccount/History
 * queries), and adjust the balance via the existing adjustLoyaltyPoints
 * mutation. No new loyalty rules/calculations — this is a UI over the
 * plugin's existing Admin API surface.
 */
export function LoyaltyPage() {
    const { t } = useLingui();
    const [searchTerm, setSearchTerm] = useState('');
    const [submittedTerm, setSubmittedTerm] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [adjustPoints, setAdjustPoints] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const queryClient = useQueryClient();

    // Ledger entry types (LoyaltyTransaction.type) shown with a readable label.
    const typeLabel: Record<string, string> = {
        EARN: t`Earned`,
        SPEND: t`Redeemed`,
        REFUND: t`Refund reversal`,
        ADJUSTMENT: t`Manual adjustment`,
        EXPIRE: t`Expired`,
        ATHLETE_REWARD: t`Athlete reward`,
        ATHLETE_REWARD_REVERSAL: t`Athlete reward reversed`,
    };

    const { data: searchData, isLoading: isSearching } = useQuery({
        queryKey: ['loyalty-customer-search', submittedTerm],
        queryFn: () => api.query(searchCustomersDocument, { term: submittedTerm }),
        enabled: submittedTerm.length > 0,
    });

    const loyaltyQueryKey = ['customer-loyalty', selectedCustomerId];
    const { data: loyaltyData, isLoading: isLoadingLoyalty } = useQuery({
        queryKey: loyaltyQueryKey,
        queryFn: () =>
            api.query(customerLoyaltyDocument, {
                customerId: selectedCustomerId as string,
                options: { skip: 0, take: HISTORY_PAGE_SIZE },
            }),
        enabled: !!selectedCustomerId,
    });

    const adjustMutation = useMutation({
        mutationFn: () =>
            api.mutate(adjustLoyaltyPointsDocument, {
                input: {
                    customerId: selectedCustomerId as string,
                    points: Number(adjustPoints),
                    description: adjustReason,
                },
            }),
        onSuccess: async () => {
            setAdjustPoints('');
            setAdjustReason('');
            await queryClient.invalidateQueries({ queryKey: loyaltyQueryKey });
        },
    });

    const customers = searchData?.customers.items ?? [];
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const account = loyaltyData?.customerLoyaltyAccount;
    const history = loyaltyData?.customerLoyaltyHistory.items ?? [];

    const canSubmitAdjustment =
        !!selectedCustomerId && adjustPoints.trim() !== '' && !Number.isNaN(Number(adjustPoints)) && Number(adjustPoints) !== 0 && adjustReason.trim() !== '';

    return (
        <Page pageId="loyalty">
            <PageTitle>
                <Trans>Loyalty</Trans>
            </PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="loyalty-search">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                <Trans>Find a customer</Trans>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form
                                className="flex gap-2"
                                onSubmit={e => {
                                    e.preventDefault();
                                    setSelectedCustomerId(null);
                                    setSubmittedTerm(searchTerm.trim());
                                }}
                            >
                                <Input
                                    placeholder={t`Search by name or email...`}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button type="submit" variant="outline">
                                    <Search className="mr-2 h-4 w-4" />
                                    <Trans>Search</Trans>
                                </Button>
                            </form>

                            {isSearching && (
                                <p className="text-sm text-muted-foreground">
                                    <Trans>Searching…</Trans>
                                </p>
                            )}

                            {submittedTerm && !isSearching && (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    <Trans>Name</Trans>
                                                </TableHead>
                                                <TableHead>
                                                    <Trans>Email</Trans>
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <Trans>Actions</Trans>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                                                        <Trans>No customers found.</Trans>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                customers.map(customer => (
                                                    <TableRow key={customer.id} className={customer.id === selectedCustomerId ? 'bg-accent/50' : undefined}>
                                                        <TableCell className="font-medium">
                                                            {customer.firstName} {customer.lastName}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">{customer.emailAddress}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button size="sm" variant="outline" onClick={() => setSelectedCustomerId(customer.id)}>
                                                                <Trans>View loyalty</Trans>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </FullWidthPageBlock>

                {selectedCustomerId && (
                    <FullWidthPageBlock blockId="loyalty-detail">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : <Trans>Loyalty account</Trans>}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {isLoadingLoyalty ? (
                                    <p className="text-sm text-muted-foreground">
                                        <Trans>Loading…</Trans>
                                    </p>
                                ) : !account ? (
                                    <p className="text-sm text-muted-foreground">
                                        <Trans>This customer has no loyalty account yet.</Trans>
                                    </p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs text-muted-foreground">
                                                    <Trans>Current balance</Trans>
                                                </p>
                                                <p className="text-2xl font-bold flex items-center gap-1.5">
                                                    <Star className="size-5 text-primary" fill="currentColor" />
                                                    {account.balance}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs text-muted-foreground">
                                                    <Trans>Lifetime earned</Trans>
                                                </p>
                                                <p className="text-2xl font-bold">{account.lifetimeEarned}</p>
                                            </div>
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs text-muted-foreground">
                                                    <Trans>Lifetime spent</Trans>
                                                </p>
                                                <p className="text-2xl font-bold">{account.lifetimeSpent}</p>
                                            </div>
                                        </div>

                                        <form
                                            className="flex flex-wrap items-end gap-3 rounded-lg border p-4"
                                            onSubmit={e => {
                                                e.preventDefault();
                                                if (canSubmitAdjustment) adjustMutation.mutate();
                                            }}
                                        >
                                            <div className="space-y-1">
                                                <Label htmlFor="adjust-points">
                                                    <Trans>Adjustment (+/-)</Trans>
                                                </Label>
                                                <Input
                                                    id="adjust-points"
                                                    type="number"
                                                    className="w-32"
                                                    value={adjustPoints}
                                                    onChange={e => setAdjustPoints(e.target.value)}
                                                    placeholder={t`e.g. -50`}
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1 min-w-50">
                                                <Label htmlFor="adjust-reason">
                                                    <Trans>Reason</Trans>
                                                </Label>
                                                <Input
                                                    id="adjust-reason"
                                                    value={adjustReason}
                                                    onChange={e => setAdjustReason(e.target.value)}
                                                    placeholder={t`Required — shown in the customer's history`}
                                                />
                                            </div>
                                            <Button type="submit" disabled={!canSubmitAdjustment || adjustMutation.isPending}>
                                                {adjustMutation.isPending ? <Trans>Applying…</Trans> : <Trans>Apply manual adjustment</Trans>}
                                            </Button>
                                        </form>

                                        <div>
                                            <h3 className="text-sm font-medium mb-2">
                                                <Trans>Recent history</Trans>
                                            </h3>
                                            <div className="border rounded-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>
                                                                <Trans>Date</Trans>
                                                            </TableHead>
                                                            <TableHead>
                                                                <Trans>Type</Trans>
                                                            </TableHead>
                                                            <TableHead>
                                                                <Trans>Description</Trans>
                                                            </TableHead>
                                                            <TableHead className="text-right">
                                                                <Trans>Points</Trans>
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {history.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                                                                    <Trans>No history yet.</Trans>
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            history.map(tx => (
                                                                <TableRow key={tx.id}>
                                                                    <TableCell className="text-muted-foreground">
                                                                        {new Date(tx.createdAt).toLocaleDateString()}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary">{typeLabel[tx.type] ?? tx.type}</Badge>
                                                                    </TableCell>
                                                                    <TableCell>{tx.description}</TableCell>
                                                                    <TableCell className={`text-right font-medium ${tx.points >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                                        {tx.points >= 0 ? '+' : ''}
                                                                        {tx.points}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </FullWidthPageBlock>
                )}
            </PageLayout>
        </Page>
    );
}
