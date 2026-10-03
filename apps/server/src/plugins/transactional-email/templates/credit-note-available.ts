import type { EmailConfig, OrderSummaryData, RenderedEmail } from '../types';
import { escapeHtml, renderEyebrow, renderLayout } from './layout';

/** Se envía con la factura rectificativa emitida al liquidarse un reembolso del pedido. */
export function renderCreditNoteAvailable(
    config: EmailConfig,
    data: { order: OrderSummaryData; invoiceNumber: string; rectifiedInvoiceNumber: string },
): RenderedEmail {
    const bodyHtml = `
${renderEyebrow('Factura rectificativa')}
<p>Hola ${escapeHtml(data.order.customerName)},</p>
<p>Hemos tramitado un reembolso de tu pedido <strong>#${escapeHtml(data.order.code)}</strong>. Te adjuntamos en PDF la factura rectificativa <strong>${escapeHtml(data.invoiceNumber)}</strong>, que corrige la factura <strong>${escapeHtml(data.rectifiedInvoiceNumber)}</strong> por el importe reembolsado (${escapeHtml(data.order.total)}).</p>
<p>El reembolso se realiza en el mismo medio de pago que usaste. También puedes descargar la factura desde tu cuenta.</p>`;
    return {
        subject: `Factura rectificativa ${data.invoiceNumber} — pedido #${data.order.code}`,
        html: renderLayout({ config, preheader: `Reembolso del pedido #${data.order.code}`, bodyHtml }),
    };
}
