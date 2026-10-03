import nodemailer, { Transporter } from 'nodemailer';
import { Logger } from '@vendure/core';

import { loggerCtx } from '../constants';
import type { EmailConfig, EmailMessage, EmailProvider, EmailSendResult } from '../types';

/**
 * Envío real por SMTP. Genérico a propósito (sin SDK de ningún proveedor) para que
 * cambiar a cualquier servicio de email transaccional (SES, Sendgrid, el relay SMTP
 * de Resend, el servidor de correo de la empresa...) sea un cambio de configuración y
 * no de código: todos hablan SMTP.
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
            // Un proveedor nunca lanza errores: un fallo de envío nunca debe llegar a lo que
            // provocó el email (una transición de pedido, un registro).
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`SmtpEmailProvider failed to send to ${message.to}: ${error}`, loggerCtx);
            return { success: false, error };
        }
    }
}
