import type { EmailConfig, RenderedEmail } from '../types';
import { escapeHtml, MUTED_COLOR, renderButton, renderEyebrow, renderLayout } from './layout';

export function renderEmailVerification(
    config: EmailConfig,
    data: { customerName: string; verificationUrl: string; needsPassword?: boolean },
): RenderedEmail {
    if (data.needsPassword) {
        // Cuenta creada para el cliente (p. ej. un atleta dado de alta desde el
        // dashboard): el mismo enlace verifica el email y le deja elegir contraseña.
        const bodyHtml = `
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Te hemos creado una cuenta en <strong>${escapeHtml(config.storeName)}</strong>. Para activarla, confirma tu email y elige tu contraseña:</p>
${renderButton(data.verificationUrl, 'Activar cuenta y crear contraseña')}
<p style="color:#6b7280;font-size:13px;">Si no esperabas este mensaje, puedes ignorarlo.</p>`;
        return {
            subject: `Activa tu cuenta en ${config.storeName}`,
            html: renderLayout({ config, preheader: 'Activa tu cuenta y elige tu contraseña', bodyHtml }),
        };
    }
    const bodyHtml = `
${renderEyebrow('Un último paso')}
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Gracias por registrarte en <strong>${escapeHtml(config.storeName)}</strong>. Confirma tu dirección de email para activar tu cuenta:</p>
${renderButton(data.verificationUrl, 'Verificar mi email')}
<p style="color:${MUTED_COLOR};font-size:13px;">Si no has creado esta cuenta, puedes ignorar este mensaje.</p>`;
    return {
        subject: `Verifica tu email en ${config.storeName}`,
        html: renderLayout({ config, preheader: 'Confirma tu dirección de email', bodyHtml }),
    };
}
