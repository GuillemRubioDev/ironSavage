import type { OrderSummaryData } from '../types';
import { BORDER_COLOR, BRAND_COLOR, escapeHtml } from './layout';

/** Shared line-item table used by every order-related email template. */
export function renderOrderLinesTable(order: OrderSummaryData): string {
    const rows = order.lines
        .map(
            line => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};">${escapeHtml(line.name)} &times; ${line.quantity}</td>
<td style="padding:10px 0;border-bottom:1px solid ${BORDER_COLOR};text-align:right;font-variant-numeric:tabular-nums;">${escapeHtml(line.linePrice)}</td>
</tr>`,
        )
        .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;background-color:#fafafa;border:1px solid ${BORDER_COLOR};border-radius:8px;padding:4px 16px;">
${rows}
<tr>
<td style="padding:14px 0 10px;font-weight:700;">Total</td>
<td style="padding:14px 0 10px;font-weight:700;text-align:right;color:${BRAND_COLOR};font-variant-numeric:tabular-nums;">${escapeHtml(order.total)}</td>
</tr>
</table>`;
}
