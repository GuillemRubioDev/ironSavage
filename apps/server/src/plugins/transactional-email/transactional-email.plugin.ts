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
 * Transactional-email infrastructure: OrderService/auth events → EmailService
 * → EmailProvider (dev / smtp — see email-config.ts). No plugin or resolver
 * calls a provider SDK directly; everything goes through EmailService, so
 * switching providers is a one-line change to the useFactory below, never to
 * business logic.
 *
 * Depends on InvoicingPlugin only through its exported InvoiceGeneratedEvent
 * type (no NestJS module import needed — the event carries everything this
 * plugin needs), so it must be registered after InvoicingPlugin in
 * vendure-config.ts's `plugins` array for that event class to exist by the
 * time this plugin's subscriber wires up.
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
