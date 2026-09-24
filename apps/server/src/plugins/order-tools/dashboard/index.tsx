import { defineDashboardExtension } from '@vendure/dashboard';

import { PrintDailyOrdersButton } from './print-daily-orders-button';
import { PrintShippingLabelButton } from './print-shipping-label-button';
import { PrintShippingLabelsBulkAction } from './print-shipping-labels-bulk-action';

defineDashboardExtension({
    actionBarItems: [
        {
            pageId: 'order-detail',
            component: ({ context }) => <PrintShippingLabelButton context={context} />,
        },
        {
            pageId: 'order-list',
            component: () => <PrintDailyOrdersButton />,
        },
    ],
    dataTables: [
        {
            pageId: 'order-list',
            bulkActions: [{ component: PrintShippingLabelsBulkAction }],
        },
    ],
});
