import { api, DashboardBaseWidget, DashboardWidgetDefinition } from '@vendure/dashboard';
import { graphql } from '@/gql';
import { Trans, useLingui } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

const draftArticlesWidgetQuery = graphql(`
    query DraftArticlesWidget {
        adminArticles(options: { filter: { status: { eq: "DRAFT" } }, take: 5, sort: { createdAt: DESC } }) {
            totalItems
            items {
                id
                titleEs
                updatedAt
            }
        }
    }
`);

export const WIDGET_ID = 'draft-articles-widget';

export function DraftArticlesWidget() {
    const { t } = useLingui();
    const { data, isLoading } = useQuery({
        queryKey: ['draft-articles-widget'],
        queryFn: () => api.query(draftArticlesWidgetQuery),
        staleTime: 60_000,
    });

    const items = data?.adminArticles.items ?? [];
    const totalItems = data?.adminArticles.totalItems ?? 0;

    return (
        <DashboardBaseWidget id={WIDGET_ID} title={t`Draft articles`} description={t`${totalItems} in draft`}>
            {isLoading ? (
                <div className="text-sm text-muted-foreground"><Trans>Loading…</Trans></div>
            ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground"><Trans>No draft articles.</Trans></div>
            ) : (
                <ul className="divide-y divide-border">
                    {items.map(article => (
                        <li key={article.id} className="py-1.5 text-sm">
                            <Link to="/content-articles/$id" params={{ id: article.id }} className="hover:underline font-medium">
                                {article.titleEs}
                            </Link>
                            <span className="text-muted-foreground"> — {t`updated ${new Date(article.updatedAt).toLocaleDateString()}`}</span>
                        </li>
                    ))}
                </ul>
            )}
            <Link to="/content-articles" className="mt-3 inline-block text-sm text-primary hover:underline">
                <Trans>View all articles</Trans>
            </Link>
        </DashboardBaseWidget>
    );
}

export const draftArticlesWidget: DashboardWidgetDefinition = {
    id: WIDGET_ID,
    name: /* i18n*/ 'Draft articles',
    component: DraftArticlesWidget,
    defaultSize: { w: 6, h: 5, x: 6, y: 7 },
    minSize: { w: 4, h: 4 },
};
