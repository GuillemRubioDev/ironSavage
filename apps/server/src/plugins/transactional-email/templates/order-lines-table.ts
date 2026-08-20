import type { OrderSummaryData } from '../types';
import { escapeHtml } from './layout';

/** Shared line-item table used by every order-related email template. */
export function renderOrderLinesTable(order: OrderSummaryData): string {
    const rows = order.lines
        .map(
            line => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(line.name)} &times; ${line.quantity}</td>
<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(line.linePrice)}</td>
</tr>`,
        )
        .join('');
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">
${rows}
<tr>
<td style="padding:12px 0 0;font-weight:700;">Total</td>
<td style="padding:12px 0 0;font-weight:700;text-align:right;">${escapeHtml(order.total)}</td>
</tr>
</table>`;
}
