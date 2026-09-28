import { api, Badge, Button } from '@vendure/dashboard';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';

import { athleteByCustomerDocument } from './graphql';

/**
 * Customer detail page block: an athlete is a customer with extra
 * privileges, so the athlete side is reachable from the customer itself —
 * its status and codes, or a shortcut to make this customer an athlete.
 */
export function CustomerAthleteBlock({ customerId }: { customerId: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['athlete-by-customer', customerId],
        queryFn: () => api.query(athleteByCustomerDocument, { customerId }),
        enabled: !!customerId,
    });
    if (isLoading) {
        return null;
    }
    const athlete = data?.athleteByCustomer;

    if (!athlete) {
        return (
            <div className="space-y-2 text-sm">
                <p className="text-xs text-muted-foreground">Regular customer — earns points on their own purchases.</p>
                <Button size="sm" variant="outline" render={<Link to="/athletes/new" search={{ customerId }} />}>
                    <Trophy className="mr-2 h-4 w-4" />
                    Make athlete
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
                <Badge variant={athlete.enabled ? 'default' : 'outline'}>{athlete.enabled ? 'Athlete' : 'Athlete (disabled)'}</Badge>
                <span className="text-xs text-muted-foreground">
                    {athlete.stats.netRewardPoints} pts · {athlete.stats.rewardedOrders} orders
                </span>
            </div>
            {athlete.codes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {athlete.codes.map(code => (
                        <Badge key={code.id} variant={code.enabled ? 'secondary' : 'outline'} className="font-mono">
                            {code.code}
                        </Badge>
                    ))}
                </div>
            )}
            <Button size="sm" variant="outline" render={<Link to="/athletes/$id" params={{ id: athlete.id }} />}>
                Manage athlete
            </Button>
        </div>
    );
}
