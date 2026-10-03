import { Trans } from '@lingui/react/macro';
import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { LoyaltyPage } from './loyalty-page';

const loyaltyRoute: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'customers',
        id: 'loyalty',
        url: '/loyalty',
        title: /* i18n*/ 'Loyalty',
    },
    path: '/loyalty',
    loader: () => ({ breadcrumb: <Trans>Loyalty</Trans> }),
    component: () => <LoyaltyPage />,
};

defineDashboardExtension({
    routes: [loyaltyRoute],
});
