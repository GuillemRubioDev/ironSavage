import { defineDashboardExtension } from '@vendure/dashboard';

import { LoginLogo } from './login-logo';
import { lowStockWidget } from './low-stock-widget';

defineDashboardExtension({
    login: {
        logo: { component: LoginLogo },
    },
    widgets: [lowStockWidget],
});
