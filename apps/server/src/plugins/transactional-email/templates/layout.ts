import type { EmailConfig } from '../types';

const BRAND_COLOR = '#16a34a';
const TEXT_COLOR = '#1f2937';
const MUTED_COLOR = '#6b7280';
const BORDER_COLOR = '#e5e7eb';

export interface LayoutOptions {
    config: EmailConfig;
    preheader?: string;
    bodyHtml: string;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Shared HTML shell — logo/store name, brand color, footer with legal links. Every template's content is wrapped in this. */
export function renderLayout({ config, preheader, bodyHtml }: LayoutOptions): string {
    const year = new Date().getFullYear();
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.storeName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER_COLOR};">
<tr><td style="padding:28px 32px;border-bottom:1px solid ${BORDER_COLOR};">
<span style="font-size:20px;font-weight:700;color:${BRAND_COLOR};">${escapeHtml(config.storeName)}</span>
</td></tr>
<tr><td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${BORDER_COLOR};color:${MUTED_COLOR};font-size:12px;line-height:1.6;">
<p style="margin:0 0 8px;">${escapeHtml(config.storeName)} — este es un email transaccional automático, por favor no respondas si no tienes una duda relacionada.</p>
<p style="margin:0;">
<a href="${config.storefrontUrl}" style="color:${MUTED_COLOR};text-decoration:underline;">Ir a la tienda</a>
&nbsp;·&nbsp;
<a href="${config.storefrontUrl}/mi-cuenta" style="color:${MUTED_COLOR};text-decoration:underline;">Mi cuenta</a>
&nbsp;·&nbsp;
<span>&copy; ${year} ${escapeHtml(config.storeName)}</span>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderButton(url: string, label: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="border-radius:8px;background-color:${BRAND_COLOR};">
<a href="${url}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;text-decoration:none;font-size:14px;">${label}</a>
</td></tr>
</table>`;
}

export { escapeHtml };
