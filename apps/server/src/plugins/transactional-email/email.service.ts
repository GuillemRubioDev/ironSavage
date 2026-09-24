import { Inject, Injectable } from '@nestjs/common';
import { Logger, RequestContext, TransactionalConnection } from '@vendure/core';

import { EMAIL_PROVIDER, loggerCtx } from './constants';
import { getEmailConfig } from './email-config';
import { EmailLog } from './email-log.entity';
import { renderEmailJob } from './templates';
import type { EmailJob, EmailMessage, EmailProvider, EmailSendResult } from './types';

/**
 * The only thing the rest of the app talks to. `send()` is the low-level
 * primitive (hands a fully-formed message to whichever EmailProvider is
 * configured); `sendTemplate()` is what event subscribers actually call —
 * it renders the right template, dedups order-scoped emails, and always
 * records the attempt, success or failure, before returning.
 *
 * Never throws: a provider failure or a template error is caught, logged,
 * and returned as `{success: false}` — the caller (an event subscriber
 * reacting to an already-committed order transition) must never be able to
 * fail because of this.
 *
 * The provider is injected (see EMAIL_PROVIDER in transactional-email.plugin.ts)
 * rather than constructed here — swapping dev/smtp/a future provider is a
 * one-line change to that provider registration, never to this class, and it
 * makes EmailService trivially testable with a fake provider.
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
     * `skipDedupCheck`: for a deliberate, repeatable admin action (e.g.
     * "resend this invoice to a different address") — order-scoped dedup
     * exists to collapse *automatic* retries of the same transactional
     * email, not to silently swallow a human asking for it again.
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
            // A unique-violation here means a concurrent send for the same
            // (type, orderId) already logged success first — this attempt
            // just lost the race, nothing further to do.
        }
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}
