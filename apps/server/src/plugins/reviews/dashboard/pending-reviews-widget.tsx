import { api, DashboardBaseWidget, DashboardWidgetDefinition } from '@vendure/dashboard';
import { graphql } from '@/gql';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { StarIcon } from 'lucide-react';

const pendingReviewsWidgetQuery = graphql(`
    query PendingReviewsWidget {
        adminProductReviews(options: { filter: { status: { eq: "PENDING" } }, take: 5, sort: { createdAt: DESC } }) {
            totalItems
            items {
                id
                productName
                rating
                title
            }
        }
    }
`);

export const WIDGET_ID = 'pending-reviews-widget';

export function PendingReviewsWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ['pending-reviews-widget'],
        queryFn: () => api.query(pendingReviewsWidgetQuery),
        staleTime: 60_000,
    });

    const items = data?.adminProductReviews.items ?? [];
    const totalItems = data?.adminProductReviews.totalItems ?? 0;

    return (
        <DashboardBaseWidget id={WIDGET_ID} title="Reviews awaiting moderation" description={`${totalItems} pending`}>
            {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground">No reviews waiting for moderation.</div>
            ) : (
                <ul className="divide-y divide-border">
                    {items.map(review => (
                        <li key={review.id} className="flex items-center justify-between py-1.5 text-sm">
                            <div className="truncate max-w-[70%]">
                                <span className="font-medium">{review.productName}</span>
                                {review.title ? <span className="text-muted-foreground"> — {review.title}</span> : null}
                            </div>
                            <span className="inline-flex items-center gap-1 shrink-0">
                                {review.rating}
                                <StarIcon className="h-3 w-3 fill-current" />
                            </span>
                        </li>
                    ))}
                </ul>
            )}
            <Link to="/product-reviews" className="mt-3 inline-block text-sm text-primary hover:underline">
                View all reviews
            </Link>
        </DashboardBaseWidget>
    );
}

export const pendingReviewsWidget: DashboardWidgetDefinition = {
    id: WIDGET_ID,
    name: 'Reviews awaiting moderation',
    component: PendingReviewsWidget,
    defaultSize: { w: 6, h: 5, x: 0, y: 7 },
    minSize: { w: 4, h: 4 },
};
