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
    const [searchTerm, setSearchTerm] = useState('');
    const [submittedTerm, setSubmittedTerm] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [adjustPoints, setAdjustPoints] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const queryClient = useQueryClient();

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
            <PageTitle>Loyalty</PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="loyalty-search">
                    <Card>
                        <CardHeader>
                            <CardTitle>Find a customer</CardTitle>
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
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="max-w-sm"
                                />
                                <Button type="submit" variant="outline">
                                    <Search className="mr-2 h-4 w-4" />
                                    Search
                                </Button>
                            </form>

                            {isSearching && <p className="text-sm text-muted-foreground">Searching…</p>}

                            {submittedTerm && !isSearching && (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {customers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                                                        No customers found.
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
                                                                View loyalty
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
                                    {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Loyalty account'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {isLoadingLoyalty ? (
                                    <p className="text-sm text-muted-foreground">Loading…</p>
                                ) : !account ? (
                                    <p className="text-sm text-muted-foreground">This customer has no loyalty account yet.</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs text-muted-foreground">Current balance</p>
                                                <p className="text-2xl font-bold flex items-center gap-1.5">
                                                    <Star className="size-5 text-primary" fill="currentColor" />
                                                    {account.balance}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs text-muted-foreground">Lifetime earned</p>
                                                <p className="text-2xl font-bold">{account.lifetimeEarned}</p>
                                            </div>
                                            <div className="rounded-lg border p-4">
                                                <p className="text-xs text-muted-foreground">Lifetime spent</p>
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
                                                <Label htmlFor="adjust-points">Adjustment (+/-)</Label>
                                                <Input
                                                    id="adjust-points"
                                                    type="number"
                                                    className="w-32"
                                                    value={adjustPoints}
                                                    onChange={e => setAdjustPoints(e.target.value)}
                                                    placeholder="e.g. -50"
                                                />
                                            </div>
                                            <div className="space-y-1 flex-1 min-w-[200px]">
                                                <Label htmlFor="adjust-reason">Reason</Label>
                                                <Input
                                                    id="adjust-reason"
                                                    value={adjustReason}
                                                    onChange={e => setAdjustReason(e.target.value)}
                                                    placeholder="Required — shown in the customer's history"
                                                />
                                            </div>
                                            <Button type="submit" disabled={!canSubmitAdjustment || adjustMutation.isPending}>
                                                {adjustMutation.isPending ? 'Applying…' : 'Apply manual adjustment'}
                                            </Button>
                                        </form>

                                        <div>
                                            <h3 className="text-sm font-medium mb-2">Recent history</h3>
                                            <div className="border rounded-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead>Description</TableHead>
                                                            <TableHead className="text-right">Points</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {history.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                                                                    No history yet.
                                                                </TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            history.map(tx => (
                                                                <TableRow key={tx.id}>
                                                                    <TableCell className="text-muted-foreground">
                                                                        {new Date(tx.createdAt).toLocaleDateString()}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge variant="secondary">{tx.type}</Badge>
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
