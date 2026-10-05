import {Skeleton} from '@/components/ui/skeleton';

export default function ArticleLoading() {
    return (
        <article>
            <div className="bg-brand">
                <div className="container mx-auto max-w-[68ch] space-y-4 px-4 pb-24 pt-10 md:pb-28 md:pt-14">
                    <Skeleton className="h-4 w-28 bg-white/10" />
                    <Skeleton className="h-3 w-32 bg-white/10" />
                    <Skeleton className="h-14 w-3/4 bg-white/10" />
                </div>
            </div>
            <div className="container mx-auto max-w-[68ch] px-4 pb-16">
                <Skeleton className="relative -mt-16 mb-10 aspect-video w-full rounded-xl md:-mt-20" />
                <div className="space-y-4">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                </div>
            </div>
        </article>
    );
}
