import type { EmailConfig, OrderSummaryData, RenderedEmail } from '../types';
import { escapeHtml, renderLayout } from './layout';
import { renderOrderLinesTable } from './order-lines-table';

export function renderOrderReceived(config: EmailConfig, data: { order: OrderSummaryData }): RenderedEmail {
    const { order } = data;
    const bodyHtml = `
<p>Hola ${escapeHtml(order.customerName)},</p>
<p>Hemos recibido tu pedido <strong>#${escapeHtml(order.code)}</strong> y lo estamos procesando. Te avisaremos en cuanto se confirme el pago.</p>
${renderOrderLinesTable(order)}`;
    return {
        subject: `Hemos recibido tu pedido #${order.code}`,
        html: renderLayout({ config, preheader: `Pedido #${order.code} recibido`, bodyHtml }),
    };
}
