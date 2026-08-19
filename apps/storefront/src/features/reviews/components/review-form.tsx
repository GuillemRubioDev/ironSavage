'use client';

import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {createReviewAction} from '@/features/reviews/actions';
import {StarRatingInput} from '@/features/reviews/components/star-rating-input';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect, NativeSelectOption} from '@/components/ui/native-select';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {useTranslations} from 'next-intl';

const reviewSchema = z.object({
    orderId: z.string().min(1),
    rating: z.number().min(1).max(5),
    title: z.string().min(1).max(120),
    comment: z.string().min(1).max(2000),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
    productId: string;
    reviewableOrders: Array<{orderId: string; orderCode: string}>;
}

export function ReviewForm({productId, reviewableOrders}: ReviewFormProps) {
    const t = useTranslations('Reviews');
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const form = useForm<ReviewFormData>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            orderId: reviewableOrders[0]?.orderId ?? '',
            rating: 0,
            title: '',
            comment: '',
        },
    });

    const onSubmit = (data: ReviewFormData) => {
        setServerError(null);
        startTransition(async () => {
            const result = await createReviewAction({
                productId,
                orderId: data.orderId,
                rating: data.rating,
                title: data.title,
                comment: data.comment,
            });
            if (result.success) {
                setSubmitted(true);
            } else {
                setServerError(result.error ?? t('unexpectedError'));
            }
        });
    };

    if (submitted) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{t('submittedForModeration')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('writeAReview')}</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        {reviewableOrders.length > 1 && (
                            <FormField
                                control={form.control}
                                name="orderId"
                                render={({field}) => (
                                    <FormItem>
                                        <FormLabel>{t('whichOrder')}</FormLabel>
                                        <FormControl>
                                            <NativeSelect {...field}>
                                                {reviewableOrders.map(order => (
                                                    <NativeSelectOption key={order.orderId} value={order.orderId}>
                                                        {order.orderCode}
                                                    </NativeSelectOption>
                                                ))}
                                            </NativeSelect>
                                        </FormControl>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="rating"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{t('rating')}</FormLabel>
                                    <FormControl>
                                        <StarRatingInput value={field.value} onChange={field.onChange} disabled={isPending}/>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="title"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{t('reviewTitle')}</FormLabel>
                                    <FormControl>
                                        <Input disabled={isPending} {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="comment"
                            render={({field}) => (
                                <FormItem>
                                    <FormLabel>{t('reviewComment')}</FormLabel>
                                    <FormControl>
                                        <Textarea rows={4} disabled={isPending} {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />

                        {serverError && <div className="text-sm text-destructive">{serverError}</div>}

                        <Button type="submit" disabled={isPending}>
                            {isPending ? t('submitting') : t('submitReview')}
                        </Button>
                    </CardContent>
                </form>
            </Form>
        </Card>
    );
}
