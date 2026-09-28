import type { EmailConfig, RenderedEmail } from '../types';
import { escapeHtml, renderButton, renderEyebrow, renderLayout } from './layout';

export function renderRegistrationConfirmation(config: EmailConfig, data: { customerName: string }): RenderedEmail {
    const bodyHtml = `
${renderEyebrow('Cuenta verificada')}
<p>Hola ${escapeHtml(data.customerName)},</p>
<p>Tu cuenta en <strong>${escapeHtml(config.storeName)}</strong> ha sido verificada correctamente. ¡Ya puedes comprar con tu cuenta!</p>
${renderButton(`${config.storefrontUrl}/productos`, 'Empezar a comprar')}
<p>Gracias por registrarte.</p>`;
    return {
        subject: `Bienvenido/a a ${config.storeName}`,
        html: renderLayout({ config, preheader: 'Tu cuenta ha sido verificada', bodyHtml }),
    };
}
