import PDFDocument from 'pdfkit';

import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoicingConfig } from './types';

// Aproxima el rojo de marca --primary del storefront (oklch(0.577 0.245 27.325)
// pasado a sRGB): PDFKit solo admite RGB/hex, no oklch.
const BRAND_RED = '#E7000B';
const BRAND_RED_SOFT = '#FBE4E1';
const INK = '#1C1A18';
const INK_SOFT = '#5C5851';
const LINE_GRAY = '#DDD9D2';

interface RenderOptions {
    logoBuffer?: Buffer;
    /** Por InvoiceLine.id (como texto). Las que falten o no se puedan leer salen sin miniatura. */
    lineImages?: Map<string, Buffer>;
}

function formatMoney(cents: number, currencyCode: string): string {
    return `${(cents / 100).toFixed(2)} ${currencyCode}`;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

/**
 * Genera el PDF de una página por factura directamente con pdfkit (sin pasar por
 * HTML ni navegador): cabecera con la marca (logo y color de acento, como en el
 * storefront), bloque «facturar a», tabla de líneas con miniatura del producto si
 * la hay, desglose de IVA, totales y notas legales.
 */
export function generateInvoicePdfBuffer(
    invoice: Invoice,
    lines: InvoiceLine[],
    store: InvoicingConfig,
    options: RenderOptions = {},
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const left = doc.page.margins.left;

        // --- Cabecera: logo + datos de la tienda (izquierda), FACTURA + datos (derecha) ---
        const headerTop = doc.y;
        if (options.logoBuffer) {
            try {
                doc.image(options.logoBuffer, left, headerTop, { fit: [130, 48] });
            } catch {
                // Un logo corrupto o ilegible nunca debe impedir el documento fiscal.
            }
        }
        const storeInfoY = options.logoBuffer ? headerTop + 54 : headerTop;
        doc.fontSize(9).fillColor(INK_SOFT);
        doc.text(store.storeName, left, storeInfoY, { width: 260 });
        doc.text(`NIF/CIF: ${store.storeTaxId}`, { width: 260 });
        doc.text(store.storeAddress, { width: 260 });
        if (store.storeEmail) doc.text(store.storeEmail, { width: 260 });
        if (store.storePhone) doc.text(store.storePhone, { width: 260 });
        // Datos del Registro Mercantil: obligatorios en las facturas de una sociedad (art. 24 RRM).
        if (store.storeRegistry) doc.fontSize(7.5).text(store.storeRegistry, { width: 260 }).fontSize(9);
        const storeInfoEndY = doc.y;

        const invoiceNumber = `${invoice.series}-${String(invoice.number).padStart(6, '0')}`;
        const isRectifying = invoice.type === 'RECTIFYING';
        doc.fillColor(BRAND_RED).fontSize(isRectifying ? 16 : 22).font('Helvetica-Bold').text(isRectifying ? 'FACTURA RECTIFICATIVA' : 'FACTURA', left, headerTop, { align: 'right', width: pageWidth });
        doc.font('Helvetica').fillColor(INK).fontSize(10);
        doc.text(`Nº ${invoiceNumber}`, { align: 'right', width: pageWidth });
        doc.fillColor(INK_SOFT);
        doc.text(`Fecha: ${formatDate(invoice.issueDate)}`, { align: 'right', width: pageWidth });
        doc.text(`Pedido: ${invoice.orderCode}`, { align: 'right', width: pageWidth });
        if (isRectifying && invoice.rectifiedInvoiceNumber) {
            // Art. 15 RD 1619/2012: identificar la factura rectificada y el motivo.
            const date = invoice.rectifiedInvoiceDate ? formatDate(invoice.rectifiedInvoiceDate) : '';
            doc.text(`Rectifica a: ${invoice.rectifiedInvoiceNumber}${date ? ` (${date})` : ''}`, { align: 'right', width: pageWidth });
            doc.text('Rectificación por diferencias', { align: 'right', width: pageWidth });
        }
        doc.fillColor(INK);

        const afterHeaderY = Math.max(doc.y, storeInfoY + 70, storeInfoEndY + 8);
        doc.moveTo(left, afterHeaderY).lineTo(left + pageWidth, afterHeaderY).lineWidth(2).strokeColor(BRAND_RED).stroke();
        doc.lineWidth(1);
        doc.y = afterHeaderY + 20;

        // --- Facturar a ---
        const billTo = invoice.billingAddressSnapshot;
        const customer = invoice.customerSnapshot;
        doc.fillColor(BRAND_RED).fontSize(10).font('Helvetica-Bold').text('FACTURAR A', left, doc.y);
        doc.font('Helvetica').fillColor(INK).fontSize(10);
        doc.text(billTo.fullName || `${customer.firstName} ${customer.lastName}`.trim());
        if (billTo.company) doc.text(billTo.company);
        if (billTo.streetLine1) doc.text(billTo.streetLine1);
        if (billTo.streetLine2) doc.text(billTo.streetLine2);
        const cityLine = [billTo.postalCode, billTo.city].filter(Boolean).join(' ');
        if (cityLine) doc.text(cityLine);
        if (billTo.province) doc.text(billTo.province);
        if (billTo.country) doc.text(billTo.country);
        doc.fillColor(INK_SOFT).text(customer.emailAddress);
        doc.fillColor(INK);

        doc.moveDown(1.5);

        // --- Tabla de líneas ---
        const imgSize = 26;
        const colX = { img: left, name: left + imgSize + 8, qty: left + 270, unit: left + 320, rate: left + 385, total: left + 440 };
        const tableWidth = pageWidth;
        let y = doc.y;

        doc.rect(left, y, tableWidth, 20).fill(BRAND_RED_SOFT);
        doc.fillColor(INK).fontSize(9).font('Helvetica-Bold');
        doc.text('Producto', colX.name, y + 6, { width: colX.qty - colX.name - 5 });
        doc.text('Cant.', colX.qty, y + 6, { width: colX.unit - colX.qty - 5 });
        doc.text('Precio', colX.unit, y + 6, { width: colX.rate - colX.unit - 5 });
        doc.text('IVA', colX.rate, y + 6, { width: colX.total - colX.rate - 5 });
        doc.text('Total', colX.total, y + 6, { width: left + tableWidth - colX.total, align: 'right' });
        y += 26;
        doc.font('Helvetica');

        for (const line of lines) {
            doc.fontSize(9);
            const nameLines = doc.heightOfString(`${line.productName} (${line.sku})`, { width: colX.qty - colX.name - 5 });
            const rowHeight = Math.max(nameLines, imgSize, 12);

            const imageBuffer = options.lineImages?.get(String(line.id));
            if (imageBuffer) {
                try {
                    doc.image(imageBuffer, colX.img, y, { width: imgSize, height: imgSize, fit: [imgSize, imgSize] });
                } catch {
                    // Una miniatura corrupta o ilegible solo deja esa línea sin imagen; nunca impide la factura.
                }
            }

            const textY = y + (rowHeight - 10) / 2;
            doc.fillColor(INK).text(`${line.productName} (${line.sku})`, colX.name, textY, { width: colX.qty - colX.name - 5 });
            doc.text(String(line.quantity), colX.qty, textY, { width: colX.unit - colX.qty - 5 });
            doc.text(formatMoney(line.unitPrice, invoice.currencyCode), colX.unit, textY, { width: colX.rate - colX.unit - 5 });
            doc.text(`${line.taxRate}%`, colX.rate, textY, { width: colX.total - colX.rate - 5 });
            doc.text(formatMoney(line.lineTotal, invoice.currencyCode), colX.total, textY, {
                width: left + tableWidth - colX.total,
                align: 'right',
            });
            y += rowHeight + 10;
            doc.moveTo(left, y - 5).lineTo(left + tableWidth, y - 5).strokeColor(LINE_GRAY).stroke();
        }

        y += 6;

        // --- Desglose de IVA por tipo ---
        const byRate = new Map<number, { base: number; tax: number }>();
        for (const line of lines) {
            const entry = byRate.get(line.taxRate) ?? { base: 0, tax: 0 };
            entry.base += line.lineTotal - line.taxAmount;
            entry.tax += line.taxAmount;
            byRate.set(line.taxRate, entry);
        }
        doc.fontSize(9).fillColor(INK_SOFT);
        for (const [rate, { base, tax }] of [...byRate.entries()].sort((a, b) => a[0] - b[0])) {
            doc.text(
                `Base ${formatMoney(base, invoice.currencyCode)} a IVA ${rate}% = ${formatMoney(tax, invoice.currencyCode)}`,
                left,
                y,
            );
            y += 12;
        }
        doc.fillColor(INK);
        y += 6;

        // --- Totales ---
        const totalsX = left + tableWidth - 200;
        doc.fontSize(10);
        doc.text('Subtotal:', totalsX, y, { width: 100 });
        doc.text(formatMoney(invoice.subtotal, invoice.currencyCode), totalsX + 100, y, { width: 100, align: 'right' });
        y += 14;
        doc.text('IVA:', totalsX, y, { width: 100 });
        doc.text(formatMoney(invoice.tax, invoice.currencyCode), totalsX + 100, y, { width: 100, align: 'right' });
        y += 18;
        doc.rect(totalsX - 8, y - 4, 208, 26).fill(BRAND_RED_SOFT);
        doc.fillColor(BRAND_RED).fontSize(13).font('Helvetica-Bold');
        doc.text('TOTAL', totalsX, y + 2, { width: 100 });
        doc.text(formatMoney(invoice.total, invoice.currencyCode), totalsX + 100, y + 2, { width: 100, align: 'right' });
        doc.font('Helvetica').fillColor(INK);
        y += 40;

        // --- Notas legales ---
        doc.fontSize(8.5).fillColor(INK_SOFT);
        const notes: string[] = [];
        if (invoice.type === 'RECTIFYING' && invoice.reason) {
            notes.push(`Motivo de la rectificación: ${invoice.reason}`);
        }
        if (lines.some(line => line.taxRate === 0)) {
            // Envíos a Canarias, Ceuta y Melilla (ver SpainTerritoriesPlugin); la redacción la confirma la gestoría.
            notes.push('Operación exenta de IVA (art. 21 de la Ley 37/1992): entrega de bienes con destino a Canarias, Ceuta o Melilla.');
        }
        for (const note of notes) {
            doc.text(note, left, y, { width: pageWidth });
            y = doc.y + 4;
        }

        // --- Registro fiscal (Veri*Factu): QR + leyenda que devuelve el proveedor ---
        const fiscal = invoice.fiscalRegistration;
        if (fiscal?.status === 'REGISTERED' && (fiscal.qrPngBase64 || fiscal.legend)) {
            y += 6;
            if (fiscal.qrPngBase64) {
                try {
                    doc.image(Buffer.from(fiscal.qrPngBase64, 'base64'), left, y, { fit: [80, 80] });
                } catch {
                    // Un QR ilegible nunca debe impedir el documento fiscal.
                }
            }
            if (fiscal.legend) {
                doc.fontSize(8.5).fillColor(INK).text(fiscal.legend, fiscal.qrPngBase64 ? left + 92 : left, y + 4, { width: 300 });
            }
            doc.fillColor(INK);
        }

        doc.end();
    });
}
