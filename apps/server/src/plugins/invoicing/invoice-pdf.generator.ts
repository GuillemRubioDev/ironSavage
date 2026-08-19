import PDFDocument from 'pdfkit';

import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoicingConfig } from './types';

function formatMoney(cents: number, currencyCode: string): string {
    return `${(cents / 100).toFixed(2)} ${currencyCode}`;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Renders a simple, single-page-per-invoice PDF directly with pdfkit (no
 * HTML-to-PDF step, no headless browser) — deliberately plain: a header, a
 * bill-to block, a line-items table, and a totals block. Layout polish is
 * left for later; the numbers and snapshots are what matter for a first
 * fiscally-usable version.
 */
export function generateInvoicePdfBuffer(invoice: Invoice, lines: InvoiceLine[], store: InvoicingConfig): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;

        // --- Store header ---
        doc.fontSize(16).text(store.storeName, left, doc.y, { bold: true } as any);
        doc.fontSize(9).fillColor('#444');
        doc.text(`NIF/CIF: ${store.storeTaxId}`);
        doc.text(store.storeAddress);
        if (store.storeEmail) doc.text(store.storeEmail);
        if (store.storePhone) doc.text(store.storePhone);
        doc.fillColor('#000');

        // --- Invoice title/meta, top right ---
        const invoiceNumber = `${invoice.series}-${String(invoice.number).padStart(6, '0')}`;
        doc.fontSize(20).text('FACTURA', left, 50, { align: 'right', width: pageWidth });
        doc.fontSize(10).text(`Nº: ${invoiceNumber}`, { align: 'right', width: pageWidth });
        doc.text(`Fecha: ${formatDate(invoice.issueDate)}`, { align: 'right', width: pageWidth });
        doc.text(`Pedido: ${invoice.orderCode}`, { align: 'right', width: pageWidth });

        doc.moveDown(2);

        // --- Bill to ---
        const billTo = invoice.billingAddressSnapshot;
        const customer = invoice.customerSnapshot;
        doc.fontSize(11).text('Facturar a:', left, doc.y, { underline: true });
        doc.fontSize(10);
        doc.text(billTo.fullName || `${customer.firstName} ${customer.lastName}`.trim());
        if (billTo.company) doc.text(billTo.company);
        if (billTo.streetLine1) doc.text(billTo.streetLine1);
        if (billTo.streetLine2) doc.text(billTo.streetLine2);
        const cityLine = [billTo.postalCode, billTo.city].filter(Boolean).join(' ');
        if (cityLine) doc.text(cityLine);
        if (billTo.province) doc.text(billTo.province);
        if (billTo.country) doc.text(billTo.country);
        doc.text(customer.emailAddress);

        doc.moveDown(1.5);

        // --- Line items table ---
        const colX = { name: left, qty: left + 240, unit: left + 300, rate: left + 370, total: left + 430 };
        const tableWidth = pageWidth;
        let y = doc.y;

        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Producto', colX.name, y, { width: colX.qty - colX.name - 5 });
        doc.text('Cant.', colX.qty, y, { width: colX.unit - colX.qty - 5 });
        doc.text('Precio', colX.unit, y, { width: colX.rate - colX.unit - 5 });
        doc.text('IVA', colX.rate, y, { width: colX.total - colX.rate - 5 });
        doc.text('Total', colX.total, y, { width: left + tableWidth - colX.total, align: 'right' });
        y += 14;
        doc.moveTo(left, y).lineTo(left + tableWidth, y).strokeColor('#ccc').stroke();
        y += 6;
        doc.font('Helvetica');

        for (const line of lines) {
            doc.fontSize(9);
            const nameLines = doc.heightOfString(`${line.productName} (${line.sku})`, { width: colX.qty - colX.name - 5 });
            doc.text(`${line.productName} (${line.sku})`, colX.name, y, { width: colX.qty - colX.name - 5 });
            doc.text(String(line.quantity), colX.qty, y, { width: colX.unit - colX.qty - 5 });
            doc.text(formatMoney(line.unitPrice, invoice.currencyCode), colX.unit, y, { width: colX.rate - colX.unit - 5 });
            doc.text(`${line.taxRate}%`, colX.rate, y, { width: colX.total - colX.rate - 5 });
            doc.text(formatMoney(line.lineTotal, invoice.currencyCode), colX.total, y, {
                width: left + tableWidth - colX.total,
                align: 'right',
            });
            y += Math.max(nameLines, 12) + 6;
        }

        doc.moveTo(left, y).lineTo(left + tableWidth, y).strokeColor('#ccc').stroke();
        y += 10;

        // --- Tax breakdown by rate ---
        const byRate = new Map<number, { base: number; tax: number }>();
        for (const line of lines) {
            const entry = byRate.get(line.taxRate) ?? { base: 0, tax: 0 };
            entry.base += line.unitPrice * line.quantity;
            entry.tax += line.taxAmount;
            byRate.set(line.taxRate, entry);
        }
        doc.fontSize(9).fillColor('#444');
        for (const [rate, { base, tax }] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
            doc.text(
                `Base ${formatMoney(base, invoice.currencyCode)} a IVA ${rate}% = ${formatMoney(tax, invoice.currencyCode)}`,
                left,
                y,
            );
            y += 12;
        }
        doc.fillColor('#000');
        y += 6;

        // --- Totals ---
        const totalsX = left + tableWidth - 200;
        doc.fontSize(10);
        doc.text('Subtotal:', totalsX, y, { width: 100 });
        doc.text(formatMoney(invoice.subtotal, invoice.currencyCode), totalsX + 100, y, { width: 100, align: 'right' });
        y += 14;
        doc.text('IVA:', totalsX, y, { width: 100 });
        doc.text(formatMoney(invoice.tax, invoice.currencyCode), totalsX + 100, y, { width: 100, align: 'right' });
        y += 14;
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('TOTAL:', totalsX, y, { width: 100 });
        doc.text(formatMoney(invoice.total, invoice.currencyCode), totalsX + 100, y, { width: 100, align: 'right' });
        doc.font('Helvetica');

        doc.end();
    });
}
