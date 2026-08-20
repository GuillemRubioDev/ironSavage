import type { EmailConfig, OrderSummaryData, RenderedEmail } from '../types';
import { escapeHtml, renderLayout } from './layout';
import { renderOrderLinesTable } from './order-lines-table';

export function renderPaymentConfirmed(config: EmailConfig, data: { order: OrderSummaryData }): RenderedEmail {
    const { order } = data;
    const bodyHtml = `
<p>Hola ${escapeHtml(order.customerName)},</p>
<p>Hemos confirmado el pago de tu pedido <strong>#${escapeHtml(order.code)}</strong>. ¡Gracias por tu compra!</p>
${renderOrderLinesTable(order)}
<p>Prepararemos tu pedido para el envío en breve.</p>`;
    return {
        subject: `Pago confirmado — pedido #${order.code}`,
        html: renderLayout({ config, preheader: `Pago confirmado para el pedido #${order.code}`, bodyHtml }),
    };
}
