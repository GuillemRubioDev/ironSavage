import {query} from '@/platform/vendure/api';
import {getAuthToken} from '@/platform/vendure/auth-token';
import {GetMyReviewableOrdersQuery, GetProductReviewsQuery} from '@/features/reviews/graphql';
import {StarRating} from '@/features/reviews/components/star-rating';
import {ReviewForm} from '@/features/reviews/components/review-form';
import {Card, CardContent} from '@/components/ui/card';
import {formatDate} from '@/platform/i18n/format';
import {Link} from '@/platform/i18n/navigation';
import {getRouteLocale} from '@/platform/i18n/server';
import {getTranslations} from 'next-intl/server';

interface ProductReviewsSectionProps {
    productId: string;
    productSlug: string;
}

export async function ProductReviewsSection({productId, productSlug}: ProductReviewsSectionProps) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Reviews'});

    const [{data}, token] = await Promise.all([
        query(GetProductReviewsQuery, {productId, options: {skip: 0, take: 20}}),
        getAuthToken(),
    ]);

    let reviewableOrders: Array<{orderId: string; orderCode: string}> = [];
    let isSignedIn = false;
    if (token) {
        const eligibility = await query(GetMyReviewableOrdersQuery, {productId}, {token});
        isSignedIn = !!eligibility.data.activeCustomer;
        reviewableOrders = eligibility.data.myReviewableOrdersForProduct;
    }

    const {averageRating, reviewCount} = data.productReviewSummary;
    const reviews = data.productReviews.items;

    return (
        <section className="py-16 border-t border-border/50">
            <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="text-2xl font-bold mb-2">{t('title')}</h2>

                <div className="flex items-center gap-3 mb-8">
                    <StarRating rating={averageRating} size="lg"/>
                    <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                        {reviewCount === 1 ? t('oneReview') : t('reviewCount', {count: reviewCount})}
                    </span>
                </div>

                {reviewableOrders.length > 0 ? (
                    <div className="mb-10">
                        <ReviewForm productId={productId} reviewableOrders={reviewableOrders}/>
                    </div>
                ) : !isSignedIn ? (
                    <p className="text-sm text-muted-foreground mb-10">
                        {t('signInToReview')}{' '}
                        <Link href={`/login?redirectTo=/productos/${productSlug}`} className="text-primary underline">
                            {t('signIn')}
                        </Link>
                    </p>
                ) : null}

                {reviews.length === 0 ? (
                    <p className="text-muted-foreground">{t('noReviews')}</p>
                ) : (
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <Card key={review.id}>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <StarRating rating={review.rating} size="sm"/>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(review.createdAt, 'short', locale)}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold mb-1">{review.title}</h3>
                                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
