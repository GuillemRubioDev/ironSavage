import type { EmailConfig, RenderedEmail } from '../types';
import { escapeHtml, renderButton, renderLayout } from './layout';

export function renderEmailVerification(
    config: EmailConfig,
    data: { customerName: string; verificationUrl: string },
): RenderedEmail {
    const bodyHtml = `
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Gracias por registrarte en <strong>${escapeHtml(config.storeName)}</strong>. Confirma tu dirección de email para activar tu cuenta:</p>
${renderButton(data.verificationUrl, 'Verificar mi email')}
<p style="color:#6b7280;font-size:13px;">Si no has creado esta cuenta, puedes ignorar este mensaje.</p>`;
    return {
        subject: `Verifica tu email en ${config.storeName}`,
        html: renderLayout({ config, preheader: 'Confirma tu dirección de email', bodyHtml }),
    };
}
