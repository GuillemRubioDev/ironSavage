import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Skeleton} from '@/components/ui/skeleton';

export default function PointsLoading() {
    return (
        <div>
            <Skeleton className="mb-6 h-14 w-64" />

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

            <div className="border rounded-lg">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-4 w-24"/>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-6 w-20"/>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-32"/>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="h-4 w-12 ml-auto"/>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
