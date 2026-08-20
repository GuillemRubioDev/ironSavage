import type { EmailConfig, RenderedEmail } from '../types';
import { escapeHtml, renderButton, renderLayout } from './layout';

export function renderPasswordReset(config: EmailConfig, data: { customerName: string; resetUrl: string }): RenderedEmail {
    const bodyHtml = `
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>${escapeHtml(config.storeName)}</strong>.</p>
${renderButton(data.resetUrl, 'Restablecer contraseña')}
<p style="color:#6b7280;font-size:13px;">Si no has solicitado este cambio, puedes ignorar este email — tu contraseña actual seguirá funcionando.</p>`;
    return {
        subject: `Recupera tu contraseña en ${config.storeName}`,
        html: renderLayout({ config, preheader: 'Restablece tu contraseña', bodyHtml }),
    };
}
