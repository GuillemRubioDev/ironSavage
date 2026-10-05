import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';

export default function AthleteLoading() {
    return (
        <div>
            <Skeleton className="h-11 w-56 mb-2 md:h-14"/>
            <Skeleton className="h-4 w-full max-w-2xl mb-6"/>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {Array.from({length: 3}).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24"/>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-16"/>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Skeleton className="h-6 w-32 mb-4"/>
            <Skeleton className="h-28 w-full md:w-1/2 mb-8 rounded-xl"/>
            <Skeleton className="h-6 w-40 mb-4"/>
            <Skeleton className="h-48 w-full rounded-lg"/>
        </div>
    );
}
