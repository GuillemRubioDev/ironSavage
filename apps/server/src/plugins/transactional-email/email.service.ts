import { Inject, Injectable } from '@nestjs/common';
import { Logger, RequestContext, TransactionalConnection } from '@vendure/core';

import { EMAIL_PROVIDER, loggerCtx } from './constants';
import { getEmailConfig } from './email-config';
import { EmailLog } from './email-log.entity';
import { renderEmailJob } from './templates';
import type { EmailJob, EmailMessage, EmailProvider, EmailSendResult } from './types';

/**
 * Lo único con lo que habla el resto de la aplicación. `send()` es la primitiva de
 * bajo nivel (entrega un mensaje completo al EmailProvider configurado);
 * `sendTemplate()` es lo que llaman los suscriptores de eventos: genera la plantilla
 * adecuada, evita duplicar emails de pedido y siempre registra el intento, vaya bien
 * o mal, antes de volver.
 *
 * Nunca lanza errores: un fallo del proveedor o de la plantilla se captura, se anota
 * en el log y se devuelve como `{success: false}`. Quien llama (un suscriptor que
 * reacciona a una transición de pedido ya confirmada) nunca debe fallar por esto.
 *
 * El proveedor se inyecta (ver EMAIL_PROVIDER en transactional-email.plugin.ts) en
 * vez de crearse aquí: cambiar entre dev/smtp/otro futuro es una línea en ese
 * registro, nunca en esta clase, y permite testear EmailService con un proveedor falso.
 */
@Injectable()
export class EmailService {
    constructor(
        private connection: TransactionalConnection,
        @Inject(EMAIL_PROVIDER) private provider: EmailProvider,
    ) {}

    async send(message: EmailMessage): Promise<EmailSendResult> {
        try {
            return await this.provider.send(message);
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`Email provider threw unexpectedly for ${message.to}: ${error}`, loggerCtx);
            return { success: false, error };
        }
    }

    /**
     * `skipDedupCheck`: para una acción deliberada y repetible de un administrador (p.
     * ej. «reenviar esta factura a otra dirección»). La deduplicación por pedido existe
     * para agrupar reintentos *automáticos* del mismo email, no para descartar en
     * silencio a una persona que lo vuelve a pedir.
     */
    async sendTemplate(ctx: RequestContext, job: EmailJob, options?: { skipDedupCheck?: boolean }): Promise<EmailSendResult> {
        const config = getEmailConfig();
        const orderId = 'orderId' in job ? job.orderId : undefined;

        if (orderId && !options?.skipDedupCheck) {
            const alreadySent = await this.connection
                .getRepository(ctx, EmailLog)
                .findOne({ where: { type: job.type, orderId, success: true } });
            if (alreadySent) {
                Logger.info(`Skipping "${job.type}" for order ${orderId} — already sent`, loggerCtx);
                return { success: true };
            }
        }

        let result: EmailSendResult;
        try {
            if (!config.enabled) {
                Logger.info(`[EMAIL DISABLED] Would send "${job.type}" to ${job.to}`, loggerCtx);
                result = { success: true };
            } else {
                const rendered = renderEmailJob(config, job);
                const attachments = 'attachments' in job ? job.attachments : undefined;
                result = await this.send({
                    to: job.to,
                    subject: rendered.subject,
                    html: rendered.html,
                    replyTo: config.replyTo,
                    attachments,
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`Failed to render/send "${job.type}" for ${job.to}: ${error}`, loggerCtx);
            result = { success: false, error };
        }

        await this.recordAttempt(ctx, job, orderId, result);
        return result;
    }

    private async recordAttempt(
        ctx: RequestContext,
        job: EmailJob,
        orderId: string | undefined,
        result: EmailSendResult,
    ): Promise<void> {
        try {
            await this.connection.getRepository(ctx, EmailLog).save(
                new EmailLog({
                    type: job.type,
                    recipient: job.to,
                    orderId,
                    success: result.success,
                    error: result.error,
                    provider: getEmailConfig().provider,
                }),
            );
        } catch (err) {
            if (!this.isUniqueViolation(err)) {
                Logger.error(`Failed to write email log for "${job.type}": ${err}`, loggerCtx);
            }
            // Una violación de unicidad aquí significa que un envío simultáneo del mismo
            // (tipo, orderId) ya registró el éxito: este intento perdió la carrera y no
            // hay nada más que hacer.
        }
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}
