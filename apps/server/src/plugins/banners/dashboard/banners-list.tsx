import {
    api,
    Badge,
    Button,
    FullWidthPageBlock,
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
import { Trans } from '@lingui/react/macro';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';

import { adminBannerListDocument, deleteBannerDocument } from './graphql';

/** Mismo enfoque de carga manual y tabla que en reseñas y contenido; las
 * extensiones del dashboard de esos plugins explican por qué no se usa <ListPage>. */
export function BannersListPage() {
    const queryKey = ['banner-list'];
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => api.query(adminBannerListDocument, { options: { skip: 0, take: 50 } }),
    });

    async function remove(id: string) {
        await api.mutate(deleteBannerDocument, { id });
        await queryClient.invalidateQueries({ queryKey });
    }

    const items = data?.adminBanners.items ?? [];

    return (
        <Page pageId="banner-list">
            <PageTitle><Trans>Home carousel banners</Trans></PageTitle>
            <PageActionBar>
                <PageActionBarRight>
                    <Button render={<Link to="/banners/new" />}>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        <Trans>New banner</Trans>
                    </Button>
                </PageActionBarRight>
            </PageActionBar>
            <PageLayout>
                <FullWidthPageBlock blockId="list-table">
                    <p className="text-sm text-muted-foreground mb-4">
                        <Trans>These are the promotional slides shown after the fixed brand/hero slide in the storefront home carousel. Lower position shows first.</Trans>
                    </p>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16"><Trans>Image</Trans></TableHead>
                                    <TableHead><Trans>Title (ES)</Trans></TableHead>
                                    <TableHead><Trans>Position</Trans></TableHead>
                                    <TableHead><Trans>Status</Trans></TableHead>
                                    <TableHead className="text-right"><Trans>Actions</Trans></TableHead>
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
                                            <Trans>No banners yet — the carousel only shows the fixed brand slide.</Trans>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(banner => (
                                        <TableRow key={banner.id}>
                                            <TableCell>
                                                {banner.image ? (
                                                    <img
                                                        src={banner.image.preview + '?preset=thumb'}
                                                        alt=""
                                                        className="h-10 w-10 rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded bg-muted" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link to="/banners/$id" params={{ id: banner.id }} className="hover:underline">
                                                    {banner.titleEs}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{banner.position}</TableCell>
                                            <TableCell>
                                                <Badge variant={banner.enabled ? 'default' : 'secondary'}>
                                                    {banner.enabled ? <Trans>Enabled</Trans> : <Trans>Disabled</Trans>}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" onClick={() => void remove(banner.id)}>
                                                    <Trans>Delete</Trans>
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
