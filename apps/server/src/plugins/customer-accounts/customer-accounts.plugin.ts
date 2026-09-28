import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions } from './api-extensions';
import { CustomerAccountService } from './customer-account.service';
import { CustomerAccountsAdminResolver } from './customer-accounts-admin.resolver';

/**
 * Lets admins unblock a customer's access from the Dashboard (Customer
 * detail → "Account access" block): see the login status, resend the
 * activation email, verify the email manually, or send a password reset.
 * No new tables — it only drives Vendure's own User/verification data and
 * events, whose emails TransactionalEmailPlugin already sends.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [CustomerAccountService],
    exports: [CustomerAccountService],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CustomerAccountsAdminResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class CustomerAccountsPlugin {}
