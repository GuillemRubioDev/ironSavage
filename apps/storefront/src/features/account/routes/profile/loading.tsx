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
                    <CardTitle><Skeleton className="h-4 w-23" /></CardTitle>
                    <CardDescription>
                        <Skeleton className="h-4 w-28" />
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32"/>
                        <Skeleton className="h-10 w-full"/>
                    </div>
                    <Skeleton className="h-10 w-32"/>
                </CardContent>
            </Card>
        </div>
    );
}
