import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {Skeleton} from '@/components/ui/skeleton';

export default function InvoicesLoading() {
    return (
        <div>
            <Skeleton className="mb-6 h-14 w-64" />

            <div className="border rounded-lg">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>Invoice Number</TableHead>
                            <TableHead>Issue Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Download</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <Skeleton className="h-4 w-24"/>
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-4 w-24"/>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="h-4 w-20 ml-auto"/>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Skeleton className="h-9 w-9 ml-auto"/>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
