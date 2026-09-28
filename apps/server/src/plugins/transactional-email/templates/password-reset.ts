import type { EmailConfig, RenderedEmail } from '../types';
import { escapeHtml, MUTED_COLOR, renderButton, renderEyebrow, renderLayout } from './layout';

export function renderPasswordReset(
    config: EmailConfig,
    data: { customerName: string; resetUrl: string; isSetup?: boolean },
): RenderedEmail {
    if (data.isSetup) {
        // The account is active (e.g. verified by the store from the Dashboard)
        // but has no password yet: same reset link, worded as "create".
        const bodyHtml = `
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Tu cuenta en <strong>${escapeHtml(config.storeName)}</strong> ya está activa. Solo falta que elijas tu contraseña para poder iniciar sesión:</p>
${renderButton(data.resetUrl, 'Crear mi contraseña')}
<p style="color:#6b7280;font-size:13px;">Si no esperabas este mensaje, puedes ignorarlo.</p>`;
        return {
            subject: `Crea tu contraseña en ${config.storeName}`,
            html: renderLayout({ config, preheader: 'Elige tu contraseña para iniciar sesión', bodyHtml }),
        };
    }
    const bodyHtml = `
${renderEyebrow('Solicitud de contraseña')}
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>${escapeHtml(config.storeName)}</strong>.</p>
${renderButton(data.resetUrl, 'Restablecer contraseña')}
<p style="color:${MUTED_COLOR};font-size:13px;">Si no has solicitado este cambio, puedes ignorar este email — tu contraseña actual seguirá funcionando.</p>`;
    return {
        subject: `Recupera tu contraseña en ${config.storeName}`,
        html: renderLayout({ config, preheader: 'Restablece tu contraseña', bodyHtml }),
    };
}
