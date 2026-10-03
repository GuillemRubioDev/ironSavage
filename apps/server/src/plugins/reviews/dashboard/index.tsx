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
import { Trans, useLingui } from '@lingui/react/macro';
import { StarIcon } from 'lucide-react';
import { useState } from 'react';
import { pendingReviewsWidget } from './pending-reviews-widget';

/**
 * A propósito NO usa la generación automática de columnas de <ListPage>/
 * <PaginatedListDataTable> de Vendure: con el tipo de lista paginada propio de este
 * plugin, la introspección del esquema acaba pidiendo solo `id` (se ve en la pestaña
 * de red como `{ items { id } totalItems }`) y la tabla muestra «Sin resultados»
 * aunque la API devuelva filas. Es un problema del framework en esta versión de
 * Vendure, no del esquema del plugin (comprobado: las listas nativas de Vendure, p.
 * ej. Productos, funcionan; renombrar el campo de la consulta y borrar todas las
 * cachés de compilación del dashboard no cambió nada). Una carga manual con una
 * tabla simple evita esa maquinaria y basta para lo que necesita esta pantalla.
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
    const { t } = useLingui();
    const statusLabel: Record<string, string> = { PENDING: t`Pending`, APPROVED: t`Approved`, REJECTED: t`Rejected` };
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
            <PageTitle><Trans>Product Reviews</Trans></PageTitle>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Input
                            placeholder={t`Search by product name...`}
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
                                <SelectValue placeholder={t`Status`} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL"><Trans>All statuses</Trans></SelectItem>
                                <SelectItem value="PENDING"><Trans>Pending</Trans></SelectItem>
                                <SelectItem value="APPROVED"><Trans>Approved</Trans></SelectItem>
                                <SelectItem value="REJECTED"><Trans>Rejected</Trans></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Trans>Status</Trans></TableHead>
                                    <TableHead><Trans>Product</Trans></TableHead>
                                    <TableHead><Trans>Rating</Trans></TableHead>
                                    <TableHead><Trans>Title</Trans></TableHead>
                                    <TableHead><Trans>Comment</Trans></TableHead>
                                    <TableHead><Trans>Date</Trans></TableHead>
                                    <TableHead className="text-right"><Trans>Actions</Trans></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            <Trans>Loading...</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            <Trans>No reviews found.</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(review => (
                                        <TableRow key={review.id}>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[review.status] ?? 'secondary'}>{statusLabel[review.status] ?? review.status}</Badge>
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
                                                            <Trans>Approve</Trans>
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => void moderate(review.id, 'reject')}>
                                                            <Trans>Reject</Trans>
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

const reviewsList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'customers',
        id: 'product-reviews',
        url: '/product-reviews',
        title: /* i18n*/ 'Reviews',
    },
    path: '/product-reviews',
    loader: () => ({ breadcrumb: <Trans>Reviews</Trans> }),
    component: () => <ReviewsListPage />,
};

defineDashboardExtension({
    routes: [reviewsList],
    widgets: [pendingReviewsWidget],
});
