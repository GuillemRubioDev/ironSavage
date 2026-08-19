import {Skeleton} from '@/components/ui/skeleton';

export default function NewsListLoading() {
    return (
        <div className="container mx-auto px-4 py-8 mt-16">
            <Skeleton className="h-10 w-64 mb-10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {Array.from({length: 9}).map((_, i) => (
                    <div key={i} className="space-y-3">
                        <Skeleton className="aspect-video w-full rounded-lg" />
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
