import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '@vendure/core';

import { loggerCtx } from '../constants';
import type { EmailMessage, EmailProvider, EmailSendResult } from '../types';

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

/**
 * Nunca envía nada: escribe el HTML generado en disco y anota un resumen de una línea
 * en el log, para que quien desarrolla abra el archivo y vea exactamente lo que se
 * habría enviado. Es el proveedor por defecto (EMAIL_PROVIDER sin definir o distinto
 * de "smtp"), para trabajar sin credenciales reales y sin enviar correos de verdad.
 */
export class DevEmailProvider implements EmailProvider {
    constructor(private outputDir: string) {}

    async send(message: EmailMessage): Promise<EmailSendResult> {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            const fileName = `${Date.now()}-${slugify(message.to)}-${slugify(message.subject)}.html`;
            const filePath = path.join(this.outputDir, fileName);
            const attachmentNote = message.attachments?.length
                ? `<p><em>Attachments: ${message.attachments.map(a => a.filename).join(', ')}</em></p>`
                : '';
            await fs.writeFile(filePath, `<!-- To: ${message.to} | Subject: ${message.subject} -->\n${attachmentNote}\n${message.html}`);

            Logger.info(`[DEV EMAIL] To: ${message.to} | Subject: "${message.subject}" | Saved to ${filePath}`, loggerCtx);
            return { success: true };
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`DevEmailProvider failed to write email to disk: ${error}`, loggerCtx);
            return { success: false, error };
        }
    }
}
