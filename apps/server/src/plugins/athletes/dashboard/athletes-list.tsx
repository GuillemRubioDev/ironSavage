import {
    api,
    Badge,
    Button,
    FullWidthPageBlock,
    Input,
    Page,
    PageActionBar,
    PageActionBarRight,
    PageLayout,
    PageTitle,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@vendure/dashboard';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, Search } from 'lucide-react';
import { useState } from 'react';

import { athleteListDocument } from './graphql';

/** Same manual-fetch-and-table approach as the Banners/Loyalty extensions. */
export function AthletesListPage() {
    const [term, setTerm] = useState('');
    const [submittedTerm, setSubmittedTerm] = useState('');
    const { data, isLoading } = useQuery({
        queryKey: ['athlete-list', submittedTerm],
        queryFn: () => api.query(athleteListDocument, { options: { skip: 0, take: 100, term: submittedTerm || undefined } }),
    });
    const items = data?.athletes.items ?? [];

    return (
        <Page pageId="athlete-list">
            <PageTitle>Athletes</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <Button render={<Link to="/athletes/new" />}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        New athlete
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <p className="text-sm text-muted-foreground mb-4">
                        Athletes don't earn regular points on their own purchases. Instead, they earn points when other customers buy
                        with one of their codes, and can spend them like any customer.
                    </p>
                    <form
                        className="flex gap-2 mb-4"
                        onSubmit={e => {
                            e.preventDefault();
                            setSubmittedTerm(term.trim());
                        }}
                    >
                        <Input placeholder="Search by name, email or code..." value={term} onChange={e => setTerm(e.target.value)} className="max-w-sm" />
                        <Button type="submit" variant="outline">
                            <Search className="mr-2 h-4 w-4" />
                            Search
                        </Button>
                    </form>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Athlete</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Codes</TableHead>
                                    <TableHead className="text-right">Rewarded orders</TableHead>
                                    <TableHead className="text-right">Net reward points</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No athletes yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(athlete => (
                                        <TableRow key={athlete.id}>
                                            <TableCell className="font-medium">
                                                {athlete.customer.firstName} {athlete.customer.lastName}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{athlete.customer.emailAddress}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {athlete.codes.map(code => (
                                                        <Badge key={code.id} variant={code.enabled ? 'secondary' : 'outline'}>
                                                            {code.code}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{athlete.stats.rewardedOrders}</TableCell>
                                            <TableCell className="text-right">{athlete.stats.netRewardPoints}</TableCell>
                                            <TableCell>
                                                <Badge variant={athlete.enabled ? 'default' : 'outline'}>{athlete.enabled ? 'Active' : 'Disabled'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" render={<Link to="/athletes/$id" params={{ id: athlete.id }} />}>
                                                    Manage
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}
