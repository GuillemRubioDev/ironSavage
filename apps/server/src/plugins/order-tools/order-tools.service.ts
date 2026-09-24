import { Injectable } from '@nestjs/common';
import { Order, OrderService, RelationPaths, RequestContext, ShippingMethodService } from '@vendure/core';
import { SortOrder } from '@vendure/common/lib/generated-types';

const RELATIONS: RelationPaths<Order> = [
    'lines.productVariant',
    'shippingLines',
    'shippingLines.shippingMethod',
    'customer',
];

function escapeHtml(value: string | null | undefined): string {
    if (!value) return '';
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function htmlPage(title: string, body: string, autoPrint: boolean): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  @page { margin: 12mm; }
  body { font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #111; margin: 0; }
  .no-print { padding: 12px; background: #f3f4f6; text-align: center; }
  .no-print button { font-size: 14px; padding: 6px 16px; cursor: pointer; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
${autoPrint ? '<div class="no-print"><button onclick="window.print()">Imprimir</button></div>' : ''}
${body}
${autoPrint ? '<script>window.onload = () => window.print();</script>' : ''}
</body>
</html>`;
}

@Injectable()
export class OrderToolsService {
    constructor(
        private orderService: OrderService,
        private shippingMethodService: ShippingMethodService,
    ) {}

    /**
     * ShippingLine.shippingMethod comes back with a blank `name` even via
     * OrderService.findOne() with 'shippingLines.shippingMethod' in
     * relations — ShippingMethod.name is a translated LocaleString, and
     * unlike ProductVariant (which OrderService does translate when loading
     * order lines), Vendure doesn't apply that same step for shipping
     * methods here. ShippingMethodService.findOne() does resolve it
     * correctly, so that's used instead, one lookup per distinct method
     * (cached — most days only use one or two shipping methods).
     */
    async resolveShippingMethodNames(ctx: RequestContext, orders: Order[]): Promise<Map<string, string>> {
        const names = new Map<string, string>();
        for (const order of orders) {
            const methodId = order.shippingLines[0]?.shippingMethodId;
            if (!methodId || names.has(String(methodId))) continue;
            const method = await this.shippingMethodService.findOne(ctx, methodId);
            if (method) names.set(String(methodId), method.name);
        }
        return names;
    }

    async getOrdersByIds(ctx: RequestContext, ids: string[]): Promise<Order[]> {
        const orders: Order[] = [];
        for (const id of ids) {
            const order = await this.orderService.findOne(ctx, id, RELATIONS);
            if (order) orders.push(order);
        }
        return orders;
    }

    async getOrdersForDay(ctx: RequestContext, day: Date, state: string | undefined): Promise<Order[]> {
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(day);
        end.setHours(23, 59, 59, 999);

        // findAll() doesn't apply the same translation hydration to nested
        // relations (productVariant.name, shippingMethod.name come back
        // blank) that findOne() does — see getOrdersByIds() below, which is
        // also what InvoicingEventSubscriber relies on for the same reason.
        // So this only uses findAll() to get the matching IDs, cheaply
        // (no relations), then re-fetches each one properly via findOne().
        const result = await this.orderService.findAll(ctx, {
            filter: {
                createdAt: { between: { start: start.toISOString(), end: end.toISOString() } },
                ...(state ? { state: { eq: state } } : {}),
            },
            sort: { createdAt: SortOrder.ASC },
            take: 100,
        });
        const ids = result.items.filter(o => o.state !== 'Cancelled').map(o => String(o.id));
        return this.getOrdersByIds(ctx, ids);
    }

    /** One label per order, each a fresh page — sized for A4, cut/fold as needed. */
    renderShippingLabelsPage(orders: Order[]): string {
        const labels = orders
            .map(order => {
                const a = order.shippingAddress;
                return `
<section style="page-break-after: always; padding: 20mm; font-size: 22px; line-height: 1.5;">
  <div style="font-size: 14px; color: #666; margin-bottom: 24px;">
    PEDIDO <strong style="font-size: 18px; color: #111;">${escapeHtml(order.code)}</strong>
  </div>
  <div style="border: 3px solid #111; padding: 16mm; max-width: 110mm;">
    <div style="font-weight: 700; font-size: 26px; margin-bottom: 10px;">${escapeHtml(a?.fullName)}</div>
    ${a?.company ? `<div>${escapeHtml(a.company)}</div>` : ''}
    <div>${escapeHtml(a?.streetLine1)}</div>
    ${a?.streetLine2 ? `<div>${escapeHtml(a.streetLine2)}</div>` : ''}
    <div>${escapeHtml(a?.postalCode)} ${escapeHtml(a?.city)}</div>
    ${a?.province ? `<div>${escapeHtml(a.province)}</div>` : ''}
    <div style="font-weight: 600;">${escapeHtml(a?.country)}</div>
    ${a?.phoneNumber ? `<div style="margin-top: 12px; font-size: 18px;">Tel: ${escapeHtml(a.phoneNumber)}</div>` : ''}
  </div>
</section>`;
            })
            .join('');
        return htmlPage(
            orders.length === 1 ? `Etiqueta — ${orders[0].code}` : `Etiquetas (${orders.length})`,
            labels || '<p style="padding:20px">No se encontraron pedidos para las etiquetas solicitadas.</p>',
            true,
        );
    }

    /** A single printable sheet listing every order for the given day. */
    renderDailyOrdersPage(orders: Order[], day: Date, methodNames: Map<string, string>): string {
        const dayLabel = day.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

        const rows = orders
            .map(order => {
                const a = order.shippingAddress;
                const methodId = order.shippingLines[0]?.shippingMethodId;
                const method = (methodId && methodNames.get(String(methodId))) || '—';
                const lines = order.lines
                    .map(
                        line =>
                            `<div>${line.quantity} × ${escapeHtml(line.productVariant.name)} <span style="color:#666">(${escapeHtml(line.productVariant.sku)})</span></div>`,
                    )
                    .join('');
                const address = a
                    ? `${escapeHtml(a.fullName)}<br>${escapeHtml(a.streetLine1)}${a.streetLine2 ? ', ' + escapeHtml(a.streetLine2) : ''}<br>${escapeHtml(a.postalCode)} ${escapeHtml(a.city)}, ${escapeHtml(a.province)}<br>${escapeHtml(a.country)}${a.phoneNumber ? '<br>Tel: ' + escapeHtml(a.phoneNumber) : ''}`
                    : '—';
                return `
<tr>
  <td style="padding:10px; border-bottom:1px solid #ddd; vertical-align:top;">
    <strong>${escapeHtml(order.code)}</strong><br>
    <span style="color:#666">${escapeHtml(order.customer?.firstName)} ${escapeHtml(order.customer?.lastName)}</span>
  </td>
  <td style="padding:10px; border-bottom:1px solid #ddd; vertical-align:top;">${lines}</td>
  <td style="padding:10px; border-bottom:1px solid #ddd; vertical-align:top; font-size: 13px;">${address}</td>
  <td style="padding:10px; border-bottom:1px solid #ddd; vertical-align:top;">${escapeHtml(method)}</td>
</tr>`;
            })
            .join('');

        const body = `
<div style="padding: 10mm;">
  <h1 style="font-size: 20px; margin-bottom: 4px;">Pedidos del ${dayLabel}</h1>
  <p style="color:#666; margin-top:0; margin-bottom: 16px;">${orders.length} pedido${orders.length === 1 ? '' : 's'} para preparar</p>
  <table style="width:100%; border-collapse: collapse; font-size: 14px;">
    <thead>
      <tr style="text-align:left; border-bottom: 2px solid #111;">
        <th style="padding:8px;">Pedido / Cliente</th>
        <th style="padding:8px;">Productos</th>
        <th style="padding:8px;">Dirección de envío</th>
        <th style="padding:8px;">Envío</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4" style="padding:20px; text-align:center; color:#666;">No hay pedidos para este día.</td></tr>'}</tbody>
  </table>
</div>`;

        return htmlPage(`Pedidos del ${dayLabel}`, body, false);
    }
}
