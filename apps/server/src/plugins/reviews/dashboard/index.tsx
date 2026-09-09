import {
    api,
    Badge,
    Button,
    DashboardRouteDefinition,
    defineDashboardExtension,
    FullWidthPageBlock,
    Input,
    Page,
    PageLayout,
    PageTitle,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@vendure/dashboard';
import { graphql } from '@/gql';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StarIcon } from 'lucide-react';
import { useState } from 'react';
import { pendingReviewsWidget } from './pending-reviews-widget';

/**
 * Deliberately NOT built on Vendure's <ListPage>/<PaginatedListDataTable>
 * auto-column-generation: for this plugin's custom paginated-list type,
 * that machinery's schema introspection ends up selecting only `id` from
 * the query (visible in the network tab as `{ items { id } totalItems }`)
 * and the table then renders "No results" despite the API returning real
 * rows — a framework issue with this Vendure version, not something
 * traceable to anything wrong in this plugin's schema (verified: Vendure's
 * own native list pages, e.g. Products, work fine; renaming the query
 * field and clearing all dashboard build caches made no difference). A
 * plain manual fetch + table sidesteps that machinery entirely and is
 * simple enough for what this screen needs to do.
 */
const PAGE_SIZE = 20;

const productReviewListDocument = graphql(`
    query ProductReviewList($options: AdminProductReviewListOptions) {
        adminProductReviews(options: $options) {
            items {
                id
                createdAt
                productName
                rating
                title
                comment
                status
            }
            totalItems
        }
    }
`);

const approveReviewDocument = graphql(`
    mutation ApproveProductReview($id: ID!) {
        approveProductReview(id: $id) {
            id
            status
        }
    }
`);

const rejectReviewDocument = graphql(`
    mutation RejectProductReview($id: ID!) {
        rejectProductReview(id: $id) {
            id
            status
        }
    }
`);

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    REJECTED: 'destructive',
};

function ReviewsListPage() {
    const [skip, setSkip] = useState(0);
    const [status, setStatus] = useState<string>('ALL');
    const [productSearch, setProductSearch] = useState('');
    const queryClient = useQueryClient();

    const queryKey = ['product-review-list', skip, status, productSearch];
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () =>
            api.query(productReviewListDocument, {
                options: {
                    skip,
                    take: PAGE_SIZE,
                    filter: {
                        ...(status !== 'ALL' ? { status: { eq: status } } : {}),
                        ...(productSearch ? { productSearch: { contains: productSearch } } : {}),
                    },
                },
            }),
    });

    async function moderate(id: string, action: 'approve' | 'reject') {
        await api.mutate(action === 'approve' ? approveReviewDocument : rejectReviewDocument, { id });
        await queryClient.invalidateQueries({ queryKey });
    }

    const items = data?.adminProductReviews.items ?? [];
    const totalItems = data?.adminProductReviews.totalItems ?? 0;

    return (
        <Page pageId="product-review-list">
            <PageTitle>Product Reviews</PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Input
                            placeholder="Search by product name..."
                            value={productSearch}
                            onChange={e => {
                                setSkip(0);
                                setProductSearch(e.target.value);
                            }}
                            className="max-w-xs"
                        />
                        <Select
                            value={status}
                            onValueChange={value => {
                                setSkip(0);
                                setStatus(value);
                            }}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="REJECTED">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Comment</TableHead>
                                    <TableHead>Date</TableHead>
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
                                            No reviews found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(review => (
                                        <TableRow key={review.id}>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[review.status] ?? 'secondary'}>{review.status}</Badge>
                                            </TableCell>
                                            <TableCell>{review.productName}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center gap-1">
                                                    {review.rating}
                                                    <StarIcon className="h-3.5 w-3.5 fill-current" />
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">{review.title}</TableCell>
                                            <TableCell className="max-w-sm">
                                                <span className="line-clamp-2 text-muted-foreground">{review.comment}</span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {review.status === 'PENDING' && (
                                                    <>
                                                        <Button size="sm" variant="outline" onClick={() => void moderate(review.id, 'approve')}>
                                                            Approve
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => void moderate(review.id, 'reject')}>
                                                            Reject
                                                        </Button>
                                                    </>
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
                            {totalItems === 0 ? 0 : skip + 1}-{Math.min(skip + PAGE_SIZE, totalItems)} of {totalItems}
                        </span>
                        <div className="space-x-2">
                            <Button size="sm" variant="outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}>
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={skip + PAGE_SIZE >= totalItems}
                                onClick={() => setSkip(skip + PAGE_SIZE)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </FullWidthPageBlock>
            </PageLayout>
        </Page>
    );
}

const reviewsList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'customers',
        id: 'product-reviews',
        url: '/product-reviews',
        title: 'Reviews',
    },
    path: '/product-reviews',
    loader: () => ({ breadcrumb: 'Reviews' }),
    component: () => <ReviewsListPage />,
};

defineDashboardExtension({
    routes: [reviewsList],
    widgets: [pendingReviewsWidget],
});
