import type { EmailConfig, OrderSummaryData, RenderedEmail } from '../types';
import { escapeHtml, renderLayout } from './layout';
import { renderOrderLinesTable } from './order-lines-table';

export function renderOrderCancelled(config: EmailConfig, data: { order: OrderSummaryData }): RenderedEmail {
    const { order } = data;
    const bodyHtml = `
<p>Hola ${escapeHtml(order.customerName)},</p>
<p>Tu pedido <strong>#${escapeHtml(order.code)}</strong> ha sido cancelado. Si tenías un pago realizado, se procesará el reembolso correspondiente.</p>
${renderOrderLinesTable(order)}
<p>Si crees que se trata de un error, contáctanos.</p>`;
    return {
        subject: `Pedido cancelado — #${order.code}`,
        html: renderLayout({ config, preheader: `El pedido #${order.code} ha sido cancelado`, bodyHtml }),
    };
}
