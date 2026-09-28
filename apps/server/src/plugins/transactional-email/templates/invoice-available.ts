import type { EmailConfig, OrderSummaryData, RenderedEmail } from '../types';
import { escapeHtml, renderEyebrow, renderLayout } from './layout';

export function renderInvoiceAvailable(
    config: EmailConfig,
    data: { order: OrderSummaryData; invoiceNumber: string },
): RenderedEmail {
    const bodyHtml = `
${renderEyebrow('Factura disponible')}
<p>Hola ${escapeHtml(data.order.customerName)},</p>
<p>Ya tienes disponible la factura <strong>${escapeHtml(data.invoiceNumber)}</strong> correspondiente a tu pedido <strong>#${escapeHtml(data.order.code)}</strong>. La encontrarás adjunta a este email en PDF.</p>
<p>También puedes descargarla en cualquier momento desde tu cuenta.</p>`;
    return {
        subject: `Factura ${data.invoiceNumber} disponible`,
        html: renderLayout({ config, preheader: `Factura ${data.invoiceNumber} de tu pedido #${data.order.code}`, bodyHtml }),
    };
}
