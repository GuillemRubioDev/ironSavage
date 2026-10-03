import { Trans } from '@lingui/react/macro';
import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { InvoicesPage } from './invoices-page';
import { OrderInvoiceBlock } from './order-invoice-block';

const invoicesRoute: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'sales',
        id: 'invoices',
        url: '/invoices',
        title: /* i18n*/ 'Invoices',
    },
    path: '/invoices',
    loader: () => ({ breadcrumb: <Trans>Invoices</Trans> }),
    component: () => <InvoicesPage />,
};

defineDashboardExtension({
    routes: [invoicesRoute],
    pageBlocks: [
        {
            id: 'order-invoice',
            title: <Trans>Invoice</Trans>,
            location: { pageId: 'order-detail', column: 'side', position: { blockId: 'customer', order: 'after' } },
            component: ({ context }) => <OrderInvoiceBlock context={context} />,
        },
    ],
});
