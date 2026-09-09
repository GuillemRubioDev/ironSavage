import { VendurePlugin } from '@vendure/core';

/**
 * Dashboard-only plugin: no server-side schema/resolvers, exists purely so
 * its `dashboard/` folder gets picked up by the Vendure Dashboard's plugin
 * scanner (which requires an actual registered VendurePlugin with a
 * `dashboard` decorator property — see @vendure/dashboard's
 * vite/utils/plugin-discovery.js). Holds the Iron Savage login-page
 * branding and the low-stock widget, neither of which belongs to any one
 * existing plugin's domain (Reviews/Content/Loyalty/Invoicing).
 */
@VendurePlugin({
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class DashboardExtrasPlugin {}
