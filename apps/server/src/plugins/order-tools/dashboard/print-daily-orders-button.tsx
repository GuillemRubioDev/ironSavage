import { Button } from '@vendure/dashboard';
import { Trans } from '@lingui/react/macro';
import { ClipboardList } from 'lucide-react';

export function PrintDailyOrdersButton() {
    return (
        <Button variant="outline" size="sm" onClick={() => window.open('/order-tools/daily-orders', '_blank')}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <Trans>Today's orders</Trans>
        </Button>
    );
}
