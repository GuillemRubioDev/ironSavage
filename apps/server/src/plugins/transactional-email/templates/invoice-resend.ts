import type { EmailConfig, OrderSummaryData, RenderedEmail } from '../types';
import { escapeHtml, renderLayout } from './layout';

export function renderInvoiceResend(
    config: EmailConfig,
    data: { order: OrderSummaryData; invoiceNumber: string },
): RenderedEmail {
    const bodyHtml = `
<p>Hola,</p>
<p>Te reenviamos la factura <strong>${escapeHtml(data.invoiceNumber)}</strong> correspondiente al pedido <strong>#${escapeHtml(data.order.code)}</strong> de ${escapeHtml(data.order.customerName)}. La encontrarás adjunta a este email en PDF.</p>`;
    return {
        subject: `Factura ${data.invoiceNumber} — pedido #${data.order.code}`,
        html: renderLayout({ config, preheader: `Factura ${data.invoiceNumber} de tu pedido #${data.order.code}`, bodyHtml }),
    };
}
