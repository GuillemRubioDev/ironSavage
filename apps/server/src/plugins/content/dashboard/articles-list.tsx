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
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { adminArticleListDocument, deleteArticleDocument, publishArticleDocument, unpublishArticleDocument } from './graphql';

/**
 * Carga manual y tabla simple, a propósito sin <ListPage>/<PaginatedListDataTable>
 * de Vendure. La extensión del dashboard del plugin de reseñas explica por qué
 * (lo mismo se aplica al tipo de lista paginada propio de este plugin).
 */
const PAGE_SIZE = 20;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
    DRAFT: 'secondary',
    PUBLISHED: 'default',
    ARCHIVED: 'outline',
};

export function ArticlesListPage() {
    const { t } = useLingui();
    const statusLabel: Record<string, string> = { DRAFT: t`Draft`, PUBLISHED: t`Published`, ARCHIVED: t`Archived` };
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
            <PageTitle><Trans>Articles</Trans></PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <Button render={<Link to="/content-articles/new" />}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        <Trans>New article</Trans>
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Input
                            placeholder={t`Search by title...`}
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
                                <SelectValue placeholder={t`Status`} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL"><Trans>All statuses</Trans></SelectItem>
                                <SelectItem value="DRAFT"><Trans>Draft</Trans></SelectItem>
                                <SelectItem value="PUBLISHED"><Trans>Published</Trans></SelectItem>
                                <SelectItem value="ARCHIVED"><Trans>Archived</Trans></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16"><Trans>Cover</Trans></TableHead>
                                    <TableHead><Trans>Title (ES)</Trans></TableHead>
                                    <TableHead><Trans>Slug</Trans></TableHead>
                                    <TableHead><Trans>Status</Trans></TableHead>
                                    <TableHead><Trans>Published</Trans></TableHead>
                                    <TableHead className="text-right"><Trans>Actions</Trans></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            <Trans>Loading...</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            <Trans>No articles found.</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(article => (
                                        <TableRow key={article.id}>
                                            <TableCell>
                                                {article.coverImage ? (
                                                    <img
                                                        src={article.coverImage.preview + '?preset=thumb'}
                                                        alt=""
                                                        className="h-10 w-10 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded bg-muted" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link
                                                    to="/content-articles/$id"
                                                    params={{ id: article.id }}
                                                    className="hover:underline"
                                                >
                                                    {article.titleEs}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{article.slug}</TableCell>
                                            <TableCell>
                                                <Badge variant={STATUS_VARIANT[article.status] ?? 'secondary'}>{statusLabel[article.status] ?? article.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {article.status !== 'ARCHIVED' && (
                                                    <Button size="sm" variant="outline" onClick={() => void togglePublish(article.id, article.status)}>
                                                        {article.status === 'PUBLISHED' ? <Trans>Unpublish</Trans> : <Trans>Publish</Trans>}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="outline" onClick={() => void remove(article.id)}>
                                                    <Trans>Delete</Trans>
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
