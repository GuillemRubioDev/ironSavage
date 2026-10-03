import { Trans } from '@lingui/react/macro';
import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { BannerFormPage } from './banner-form';
import { BannersListPage } from './banners-list';

const bannersList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'marketing',
        id: 'banners',
        url: '/banners',
        title: /* i18n*/ 'Home banners',
    },
    path: '/banners',
    loader: () => ({ breadcrumb: <Trans>Home banners</Trans> }),
    component: () => <BannersListPage />,
};

const bannerNew: DashboardRouteDefinition = {
    path: '/banners/new',
    loader: () => ({ breadcrumb: <Trans>New banner</Trans> }),
    component: () => <BannerFormPage />,
};

const bannerDetail: DashboardRouteDefinition = {
    path: '/banners/$id',
    loader: () => ({ breadcrumb: <Trans>Banner</Trans> }),
    component: () => <BannerFormPage />,
};

defineDashboardExtension({
    routes: [bannersList, bannerNew, bannerDetail],
});
