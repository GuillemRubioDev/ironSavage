import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { LoyaltyPage } from './loyalty-page';

const loyaltyRoute: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'customers',
        id: 'loyalty',
        url: '/loyalty',
        title: 'Loyalty',
    },
    path: '/loyalty',
    loader: () => ({ breadcrumb: 'Loyalty' }),
    component: () => <LoyaltyPage />,
};

defineDashboardExtension({
    routes: [loyaltyRoute],
});
