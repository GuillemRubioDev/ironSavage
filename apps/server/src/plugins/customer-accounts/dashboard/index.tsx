import { defineDashboardExtension } from '@vendure/dashboard';

import { CustomerAccountAccess } from './customer-account-access';

defineDashboardExtension({
    pageBlocks: [
        {
            id: 'customer-account-access',
            title: 'Account access',
            location: { pageId: 'customer-detail', column: 'side', position: { blockId: 'status', order: 'after' } },
            component: ({ context }) => (context.entity?.id ? <CustomerAccountAccess customerId={context.entity.id} /> : null),
            requiresPermission: 'ReadCustomer',
        },
    ],
});
