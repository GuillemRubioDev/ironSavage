import { Trans } from '@lingui/react/macro';
import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { AthleteDetailPage } from './athlete-detail';
import { AthleteNewPage } from './athlete-new';
import { AthletesListPage } from './athletes-list';
import { CustomerAthleteBlock } from './customer-athlete-block';

// Dentro de «Clientes», junto a Fidelización: un atleta es un cliente que gana
// puntos de otra manera.
const athletesList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'customers',
        id: 'athletes',
        url: '/athletes',
        // `/* i18n*/` marca un mensaje con id explícito: el menú traduce los títulos
        // con i18n.t(title), igual que las entradas propias del dashboard.
        title: /* i18n*/ 'Athletes',
        requiresPermission: 'ReadAthlete',
    },
    path: '/athletes',
    loader: () => ({ breadcrumb: <Trans>Athletes</Trans> }),
    component: () => <AthletesListPage />,
};

const athleteNew: DashboardRouteDefinition = {
    path: '/athletes/new',
    loader: () => ({ breadcrumb: <Trans>New athlete</Trans> }),
    component: () => <AthleteNewPage />,
};

const athleteDetail: DashboardRouteDefinition = {
    path: '/athletes/$id',
    loader: () => ({ breadcrumb: <Trans>Athlete</Trans> }),
    component: () => <AthleteDetailPage />,
};

defineDashboardExtension({
    routes: [athletesList, athleteNew, athleteDetail],
    pageBlocks: [
        {
            id: 'customer-athlete',
            title: <Trans>Athlete</Trans>,
            // Tras «Grupos de clientes»: la gestión de la cuenta (cosa del cliente, ver
            // el plugin customer-accounts) queda justo debajo del Estado.
            location: { pageId: 'customer-detail', column: 'side', position: { blockId: 'groups', order: 'after' } },
            component: ({ context }) => (context.entity?.id ? <CustomerAthleteBlock customerId={context.entity.id} /> : null),
            requiresPermission: 'ReadAthlete',
        },
    ],
});
