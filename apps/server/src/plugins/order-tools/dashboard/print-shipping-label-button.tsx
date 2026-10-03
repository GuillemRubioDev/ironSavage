import { Button, PageContextValue } from '@vendure/dashboard';
import { Trans } from '@lingui/react/macro';
import { Printer } from 'lucide-react';

export function PrintShippingLabelButton({ context }: { context: PageContextValue }) {
    const orderId = context.entity?.id;
    if (!orderId) return null;

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/order-tools/shipping-labels?orders=${orderId}`, '_blank')}
        >
            <Printer className="mr-2 h-4 w-4" />
            <Trans>Print shipping label</Trans>
        </Button>
    );
}
