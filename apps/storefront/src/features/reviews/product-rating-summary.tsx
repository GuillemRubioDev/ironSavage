import {getTranslations} from 'next-intl/server';
import {getRouteLocale} from '@/platform/i18n/server';
import {query} from '@/platform/vendure/api';
import {GetProductRatingSummaryQuery} from '@/features/reviews/graphql';
import {StarRating} from '@/features/reviews/components/star-rating';

/** Estrellas y nº de reseñas junto al nombre en la ficha, con enlace a las reseñas; nada si aún no hay. */
export async function ProductRatingSummary({productId}: {productId: string}) {
    const locale = await getRouteLocale();
    const t = await getTranslations({locale, namespace: 'Reviews'});
    const {data} = await query(GetProductRatingSummaryQuery, {productId});
    const {averageRating, reviewCount} = data.productReviewSummary;
    if (!reviewCount) return null;

    return (
        <a href="#resenas" className="inline-flex items-center gap-2 text-sm">
            <StarRating rating={averageRating} size="sm" />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground underline-offset-4 hover:underline">
                {reviewCount === 1 ? t('oneReview') : t('reviewCount', {count: reviewCount})}
            </span>
        </a>
    );
}
