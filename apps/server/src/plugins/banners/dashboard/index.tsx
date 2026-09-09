import { DashboardRouteDefinition, defineDashboardExtension } from '@vendure/dashboard';

import { BannerFormPage } from './banner-form';
import { BannersListPage } from './banners-list';

const bannersList: DashboardRouteDefinition = {
    navMenuItem: {
        sectionId: 'marketing',
        id: 'banners',
        url: '/banners',
        title: 'Home banners',
    },
    path: '/banners',
    loader: () => ({ breadcrumb: 'Home banners' }),
    component: () => <BannersListPage />,
};

const bannerNew: DashboardRouteDefinition = {
    path: '/banners/new',
    loader: () => ({ breadcrumb: 'New banner' }),
    component: () => <BannerFormPage />,
};

const bannerDetail: DashboardRouteDefinition = {
    path: '/banners/$id',
    loader: () => ({ breadcrumb: 'Banner' }),
    component: () => <BannerFormPage />,
};

defineDashboardExtension({
    routes: [bannersList, bannerNew, bannerDetail],
});
