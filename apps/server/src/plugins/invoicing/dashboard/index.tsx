import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { InvoicesPage } from './invoices-page';
import { OrderInvoiceBlock } from './order-invoice-block';

const invoicesRoute: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'sales',
        id: 'invoices',
        url: '/invoices',
        title: 'Invoices',
    },
    path: '/invoices',
    loader: () => ({ breadcrumb: 'Invoices' }),
    component: () => <InvoicesPage />,
};

defineDashboardExtension({
    routes: [invoicesRoute],
    pageBlocks: [
        {
            id: 'order-invoice',
            title: 'Invoice',
            location: { pageId: 'order-detail', column: 'side', position: { blockId: 'customer', order: 'after' } },
            component: ({ context }) => <OrderInvoiceBlock context={context} />,
        },
    ],
});
