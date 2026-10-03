import {
    api,
    Badge,
    Button,
    FullWidthPageBlock,
    Input,
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
import { useLocalFormat } from '@vendure/dashboard';
import { useQuery } from '@tanstack/react-query';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { Download } from 'lucide-react';
import { useState } from 'react';

import { adminInvoiceListDocument } from './graphql';

/**
 * Deliberately a plain manual fetch + table, not <ListPage>/
 * <PaginatedListDataTable> — see the Reviews plugin's dashboard extension
 * for why (same custom-paginated-list issue applies to this plugin's type).
 */
const PAGE_SIZE = 20;

export function InvoicesPage() {
    const { t } = useLingui();
    const [skip, setSkip] = useState(0);
    const [search, setSearch] = useState('');
    const { formatCurrency } = useLocalFormat();

    const queryKey = ['invoice-list', skip, search];
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () =>
            api.query(adminInvoiceListDocument, {
                options: { skip, take: PAGE_SIZE, ...(search ? { search } : {}) },
            }),
    });

    const items = data?.invoices.items ?? [];
    const totalItems = data?.invoices.totalItems ?? 0;

    return (
        <Page pageId="invoice-list">
            <PageTitle><Trans>Invoices</Trans></PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Input
                            placeholder={t`Search by order code or invoice number...`}
                            value={search}
                            onChange={e => {
                                setSkip(0);
                                setSearch(e.target.value);
                            }}
                            className="max-w-sm"
                        />
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Trans>Number</Trans></TableHead>
                                    <TableHead><Trans>Order</Trans></TableHead>
                                    <TableHead><Trans>Issue date</Trans></TableHead>
                                    <TableHead className="text-right"><Trans>Total</Trans></TableHead>
                                    <TableHead className="text-right">PDF</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            <Trans>Loading...</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            <Trans>No invoices found.</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(invoice => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-medium">{invoice.formattedNumber}</TableCell>
                                            <TableCell>
                                                <Link to={`/orders/${invoice.orderId}`} className="hover:underline">
                                                    {invoice.orderCode}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(invoice.issueDate).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(invoice.total, invoice.currencyCode)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {invoice.hasPdf ? (
                                                    <Button size="sm" variant="outline" render={<a href={`/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" />}>
                                                        <Download className="h-3.5 w-3.5" />
                                                    </Button>
                                                ) : (
                                                    <Badge variant="secondary"><Trans>Not generated</Trans></Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                        <span>
                            <Trans>{totalItems === 0 ? 0 : skip + 1}-{Math.min(skip + PAGE_SIZE, totalItems)} of {totalItems}</Trans>
                        </span>
                        <div className="space-x-2">
                            <Button size="sm" variant="outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>
                                <Trans>Previous</Trans>
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={skip + PAGE_SIZE >= totalItems}
                                onClick={() => setSkip(skip + PAGE_SIZE)}
                            >
                                <Trans>Next</Trans>
                            </Button>
                        </div>
                    </div>
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}
