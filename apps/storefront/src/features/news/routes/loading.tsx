import {Skeleton} from '@/components/ui/skeleton';

export default function ArticleLoading() {
    return (
        <article className="container mx-auto px-4 py-8 max-w-3xl">
            <Skeleton className="h-4 w-24 mb-6" />
            <Skeleton className="h-10 w-3/4 mb-3" />
            <Skeleton className="h-4 w-32 mb-6" />
            <Skeleton className="aspect-video w-full rounded-xl mb-8" />
            <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </article>
    );
}
