import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';

export default function ProfileLoading() {
    return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-14 w-64" />
                <p className="text-muted-foreground mt-2">
                    <Skeleton className="h-4 w-39" />
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-4 w-27" /></CardTitle>
                    <CardDescription>
                        <Skeleton className="h-4 w-29" />
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm font-medium"><Skeleton className="h-4 w-13" /></p>
                        <Skeleton className="h-4 w-48 mt-1"/>
                    </div>
                    <div>
                        <p className="text-sm font-medium"><Skeleton className="h-4 w-12" /></p>
                        <Skeleton className="h-4 w-32 mt-1"/>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle><Skeleton className="h-4 w-32" /></CardTitle>
                    <CardDescription>
                        <Skeleton className="h-4 w-56" />
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[0, 1].map((row) => (
                        <div key={row} className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-44" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
