import nodemailer, { Transporter } from 'nodemailer';
import { Logger } from '@vendure/core';

import { loggerCtx } from '../constants';
import type { EmailConfig, EmailMessage, EmailProvider, EmailSendResult } from '../types';

/**
 * Real delivery via SMTP. Deliberately generic (no vendor-specific SDK) so
 * swapping to any transactional-email service (SES, Sendgrid, Resend's SMTP
 * relay, a company mail server, ...) is a config change, not a code change —
 * they all speak SMTP.
 */
export class SmtpEmailProvider implements EmailProvider {
    private transporter: Transporter;

    constructor(smtp: NonNullable<EmailConfig['smtp']>) {
        this.transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: smtp.user && smtp.password ? { user: smtp.user, pass: smtp.password } : undefined,
        });
    }

    async send(message: EmailMessage): Promise<EmailSendResult> {
        try {
            await this.transporter.sendMail({
                to: message.to,
                subject: message.subject,
                html: message.html,
                text: message.text,
                replyTo: message.replyTo,
                attachments: message.attachments?.map(a => ({
                    filename: a.filename,
                    content: a.content,
                    contentType: a.contentType,
                })),
            });
            return { success: true };
        } catch (err) {
            // Never throw out of a provider — a delivery failure must never propagate
            // back into whatever triggered the email (an order transition, a signup).
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`SmtpEmailProvider failed to send to ${message.to}: ${error}`, loggerCtx);
            return { success: false, error };
        }
    }
}
