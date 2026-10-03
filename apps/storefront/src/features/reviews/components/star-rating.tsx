import {Star} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useTranslations} from 'next-intl';

interface StarRatingProps {
    rating: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZE_CLASSES = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
};

export function StarRating({rating, size = 'md', className}: StarRatingProps) {
    const t = useTranslations('Reviews');
    return (
        <div className={cn('flex items-center gap-0.5', className)} role="img" aria-label={t('starsLabel', {rating: Math.round(rating * 10) / 10})}>
            {[1, 2, 3, 4, 5].map(value => (
                <Star
                    key={value}
                    aria-hidden="true"
                    className={cn(
                        SIZE_CLASSES[size],
                        value <= Math.round(rating) ? 'fill-primary text-primary' : 'fill-none text-muted-foreground'
                    )}
                />
            ))}
        </div>
    );
}
