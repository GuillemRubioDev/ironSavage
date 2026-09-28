import type { EmailConfig } from '../types';
import { LOGO_DATA_URI } from './logo-asset';

/**
 * Hex equivalents of the storefront's own oklch design tokens (globals.css,
 * light theme — email clients don't reliably support oklch()), resolved once
 * via a headless-browser canvas conversion so these are the real brand colors,
 * not a guess: --primary, --foreground, --muted, --destructive.
 */
export const BRAND_COLOR = '#e7000b';
export const BRAND_DARK = '#0e0f12';
export const TEXT_COLOR = '#1f2937';
export const MUTED_COLOR = '#6b7280';
export const BORDER_COLOR = '#e5e7eb';
export const PAGE_BG = '#f0f2f4';

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

/**
 * Small uppercase label above a heading (e.g. "PEDIDO CONFIRMADO") — the same
 * eyebrow-label pattern the storefront uses for option-group labels and trust
 * badges, giving the order-status emails a bit of hierarchy instead of every
 * email opening on the same flat "Hola {name}," line.
 */
export function renderEyebrow(label: string, color: string = BRAND_COLOR): string {
    return `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${color};">${escapeHtml(label)}</p>`;
}

/** Shared HTML shell — dark header with the real wordmark, brand-red accents, dark footer. Every template's content is wrapped in this. */
export function renderLayout({ config, preheader, bodyHtml }: LayoutOptions): string {
    const year = new Date().getFullYear();
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.storeName)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${PAGE_BG};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${BORDER_COLOR};">
<tr><td style="height:4px;line-height:4px;font-size:0;background-color:${BRAND_COLOR};">&nbsp;</td></tr>
<tr><td align="center" style="padding:28px 32px;background-color:${BRAND_DARK};">
<img src="${LOGO_DATA_URI}" width="150" height="50" alt="${escapeHtml(config.storeName)}" style="display:block;width:150px;height:50px;border:0;">
</td></tr>
<tr><td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
${bodyHtml}
</td></tr>
<tr><td style="padding:24px 32px;background-color:${BRAND_DARK};color:rgba(255,255,255,0.6);font-size:12px;line-height:1.6;">
<p style="margin:0 0 8px;">${escapeHtml(config.storeName)} — este es un email transaccional automático, por favor no respondas si no tienes una duda relacionada.</p>
<p style="margin:0;">
<a href="${config.storefrontUrl}" style="color:#ffffff;text-decoration:underline;">Ir a la tienda</a>
&nbsp;·&nbsp;
<a href="${config.storefrontUrl}/mi-cuenta" style="color:#ffffff;text-decoration:underline;">Mi cuenta</a>
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
<tr><td style="border-radius:6px;background-color:${BRAND_COLOR};">
<a href="${url}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-weight:700;text-decoration:none;font-size:13px;letter-spacing:0.03em;text-transform:uppercase;">${label}</a>
</td></tr>
</table>`;
}

export { escapeHtml };
