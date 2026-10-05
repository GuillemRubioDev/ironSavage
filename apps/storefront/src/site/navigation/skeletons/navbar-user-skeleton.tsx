import { Skeleton } from '@/components/ui/skeleton';

export function NavbarUserSkeleton() {
    return (
        <div className="flex items-center gap-2">
            <Skeleton className="size-10 lg:h-9 lg:w-24" />
        </div>
    );
}
