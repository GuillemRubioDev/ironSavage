import { Trans } from '@lingui/react/macro';
import { api, Badge, Button } from '@vendure/dashboard';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';

import { athleteByCustomerDocument } from './graphql';

/**
 * Bloque de la ficha de cliente: un atleta es un cliente con privilegios extra, así
 * que lo de atleta se ve desde el propio cliente (su estado y sus códigos) o hay
 * un acceso directo para hacerlo atleta.
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
                <p className="text-xs text-muted-foreground">
                    <Trans>Regular customer — earns points on their own purchases.</Trans>
                </p>
                <Button size="sm" variant="outline" render={<Link to="/athletes/new" search={{ customerId }} />}>
                    <Trophy className="mr-2 h-4 w-4" />
                    <Trans>Make athlete</Trans>
                </Button>
            </div>
        );
    }

    const points = athlete.stats.netRewardPoints;
    const orders = athlete.stats.rewardedOrders;
    return (
        <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
                <Badge variant={athlete.enabled ? 'default' : 'outline'}>
                    {athlete.enabled ? <Trans>Athlete</Trans> : <Trans>Athlete (disabled)</Trans>}
                </Badge>
                <span className="text-xs text-muted-foreground">
                    <Trans>
                        {points} pts · {orders} orders
                    </Trans>
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
                <Trans>Manage athlete</Trans>
            </Button>
        </div>
    );
}
