import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions } from './api-extensions';
import { CustomerAccountService } from './customer-account.service';
import { CustomerAccountsAdminResolver } from './customer-accounts-admin.resolver';

/**
 * Permite a los administradores desbloquear el acceso de un cliente desde el
 * dashboard (ficha del cliente → bloque «Acceso a la cuenta»): ver el estado del
 * acceso, reenviar el email de activación, verificar el email a mano o enviar un
 * restablecimiento de contraseña. Sin tablas nuevas: solo usa los datos de usuario
 * y verificación y los eventos de Vendure, cuyos emails ya envía
 * TransactionalEmailPlugin.
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
