import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { EMAIL_PROVIDER } from './constants';
import { getEmailConfig } from './email-config';
import { EmailLog } from './email-log.entity';
import { EmailService } from './email.service';
import { createEmailProvider } from './providers';
import { TransactionalEmailSubscriber } from './transactional-email.subscriber';

export { EmailService } from './email.service';
export type { EmailJob, EmailMessage, EmailProvider, EmailSendResult } from './types';

/**
 * Infraestructura de emails automáticos: eventos de pedidos y autenticación →
 * EmailService → EmailProvider (dev / smtp; ver email-config.ts). Ningún plugin ni
 * resolver llama directamente al SDK de un proveedor; todo pasa por EmailService, así
 * que cambiar de proveedor es una línea en el useFactory de abajo, nunca en la lógica
 * de negocio.
 *
 * Depende de InvoicingPlugin solo a través de su tipo exportado
 * InvoiceGeneratedEvent (sin importar el módulo NestJS: el evento trae todo lo que
 * necesita este plugin), así que debe registrarse después de InvoicingPlugin en el
 * array `plugins` de vendure-config.ts para que esa clase de evento exista cuando se
 * conecte el suscriptor de este plugin.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        { provide: EMAIL_PROVIDER, useFactory: () => createEmailProvider(getEmailConfig()) },
        EmailService,
        TransactionalEmailSubscriber,
    ],
    entities: [EmailLog],
    compatibility: '^3.0.0',
})
export class TransactionalEmailPlugin {}
