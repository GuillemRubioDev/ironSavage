import {Skeleton} from '@/components/ui/skeleton';

export default function NewsListLoading() {
    return (
        <>
            <div className="bg-brand">
                <div className="container mx-auto space-y-4 px-4 py-8 md:py-10">
                    <Skeleton className="h-3 w-32 bg-white/10" />
                    <Skeleton className="h-14 w-64 bg-white/10" />
                </div>
            </div>
            <div className="container mx-auto px-4 py-10">
                <Skeleton className="mb-10 h-80 w-full rounded-xl" />
                <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({length: 6}).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="aspect-video w-full rounded-lg" />
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-6 w-full" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
