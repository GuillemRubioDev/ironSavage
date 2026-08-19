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
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { adminArticleListDocument, deleteArticleDocument, publishArticleDocument, unpublishArticleDocument } from './graphql';

/**
 * A plain manual fetch + table, deliberately not built on Vendure's
 * <ListPage>/<PaginatedListDataTable> — see the Reviews plugin's dashboard
 * extension for why (documented there, applies identically to this plugin's
 * own custom paginated-list type).
 */
const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
    DRAFT: 'secondary',
    PUBLISHED: 'default',
    ARCHIVED: 'outline',
};

export function ArticlesListPage() {
    const [skip, setSkip] = useState(0);
    const [status, setStatus] = useState<string>('ALL');
    const [titleSearch, setTitleSearch] = useState('');
    const queryClient = useQueryClient();

    const queryKey = ['content-article-list', skip, status, titleSearch];
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () =>
            api.query(adminArticleListDocument, {
                options: {
                    skip,
                    take: PAGE_SIZE,
                    filter: {
                        ...(status !== 'ALL' ? { status: { eq: status } } : {}),
                        ...(titleSearch ? { title: { contains: titleSearch } } : {}),
                    },
                },
            }),
    });

    async function refresh() {
        await queryClient.invalidateQueries({ queryKey });
    }

    async function togglePublish(id: string, currentStatus: string) {
        await api.mutate(currentStatus === 'PUBLISHED' ? unpublishArticleDocument : publishArticleDocument, { id });
        await refresh();
    }

    async function remove(id: string) {
        await api.mutate(deleteArticleDocument, { id });
        await refresh();
    }

    const items = data?.adminArticles.items ?? [];
    const totalItems = data?.adminArticles.totalItems ?? 0;

    return (
        <Page pageId="content-article-list">
            <PageTitle>Articles</PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <Button render={<Link to="/content-articles/new" />}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        New article
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Input
                            placeholder="Search by title..."
                            value={titleSearch}
                            onChange={e => {
                                setSkip(0);
                                setTitleSearch(e.target.value);
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
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Published</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No articles found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(article => (
                                        <TableRow key={article.id}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    to="/content-articles/$id"
                                                    params={{ id: article.id }}
                                                    className="hover:underline"
                                                >
                                                    {article.title}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{article.slug}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[article.status] ?? 'secondary'}>{article.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {article.status !== 'ARCHIVED' && (
                                                    <Button size="sm" variant="outline" onClick={() => void togglePublish(article.id, article.status)}>
                                                        {article.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => void remove(article.id)}>
                                                    Delete
                                                </Button>
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
