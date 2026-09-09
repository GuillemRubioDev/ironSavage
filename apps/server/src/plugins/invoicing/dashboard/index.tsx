import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { InvoicesPage } from './invoices-page';

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
});
