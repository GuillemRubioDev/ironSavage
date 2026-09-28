import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { AthleteDetailPage } from './athlete-detail';
import { AthleteNewPage } from './athlete-new';
import { AthletesListPage } from './athletes-list';
import { CustomerAthleteBlock } from './customer-athlete-block';

// Under "Customers", next to Loyalty: an athlete is a customer with a
// different way of earning points.
const athletesList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'customers',
        id: 'athletes',
        url: '/athletes',
        title: 'Athletes',
        requiresPermission: 'ReadAthlete',
    },
    path: '/athletes',
    loader: () => ({ breadcrumb: 'Athletes' }),
    component: () => <AthletesListPage />,
};

const athleteNew: DashboardRouteDefinition = {
    path: '/athletes/new',
    loader: () => ({ breadcrumb: 'New athlete' }),
    component: () => <AthleteNewPage />,
};

const athleteDetail: DashboardRouteDefinition = {
    path: '/athletes/$id',
    loader: () => ({ breadcrumb: 'Athlete' }),
    component: () => <AthleteDetailPage />,
};

defineDashboardExtension({
    routes: [athletesList, athleteNew, athleteDetail],
    pageBlocks: [
        {
            id: 'customer-athlete',
            title: 'Athlete',
            // After "Customer groups": account management (a customer-level
            // concern, see the customer-accounts plugin) stays right under Status.
            location: { pageId: 'customer-detail', column: 'side', position: { blockId: 'groups', order: 'after' } },
            component: ({ context }) => (context.entity?.id ? <CustomerAthleteBlock customerId={context.entity.id} /> : null),
            requiresPermission: 'ReadAthlete',
        },
    ],
});
