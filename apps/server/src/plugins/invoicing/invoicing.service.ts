import { promises as fs } from 'fs';
import path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService, ID, Logger, Order, PaginatedList, Refund, RequestContext, TransactionalConnection } from '@vendure/core';
import { Brackets } from 'typeorm';

import { DEFAULT_INVOICE_SERIES, loggerCtx, RECTIFYING_INVOICE_SERIES } from './constants';
import { getInvoicingConfig } from './invoicing-config';
import { generateInvoicePdfBuffer } from './invoice-pdf.generator';
import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceSequence } from './invoice-sequence.entity';
import { LOGO_PNG_BASE64 } from './logo-base64';
import { AddressSnapshot, CustomerSnapshot, FiscalInvoiceData, InvoiceLineData } from './types';
import { buildRectifyingLines } from './rectifying-lines';

export type GenerateInvoiceResult = { created: boolean; invoice: Invoice };

const LOGO_BUFFER = Buffer.from(LOGO_PNG_BASE64, 'base64');

@Injectable()
export class InvoicingService {
    constructor(
        private connection: TransactionalConnection,
        private configService: ConfigService,
    ) {}

    /**
     * Idempotent: if an Invoice already exists for this order (a unique index
     * on `orderId` makes this race-safe too), returns it unchanged instead of
     * creating a second one. `order` must have `lines.productVariant`,
     * `shippingLines`, `surcharges` and `customer` relations loaded.
     */
    async generateForOrder(ctx: RequestContext, order: Order): Promise<GenerateInvoiceResult> {
        const preCheck = await this.connection.getRepository(ctx, Invoice).findOne({ where: { orderId: order.id, type: 'ORDINARY' } });
        if (preCheck) {
            return { created: false, invoice: preCheck };
        }

        let result: GenerateInvoiceResult;
        try {
            result = await this.connection.withTransaction(ctx, async txCtx => {
                const invoiceRepo = this.connection.getRepository(txCtx, Invoice);
                const alreadyExists = await invoiceRepo.findOne({ where: { orderId: order.id, type: 'ORDINARY' } });
                if (alreadyExists) {
                    return { created: false, invoice: alreadyExists };
                }

                const series = DEFAULT_INVOICE_SERIES;
                const number = await this.allocateNextNumber(txCtx, series);
                const { lines, subtotal, tax, total } = this.buildLineSnapshots(order);

                const invoice = await invoiceRepo.save(
                    new Invoice({
                        orderId: order.id,
                        orderCode: order.code,
                        customerId: order.customerId,
                        series,
                        number,
                        issueDate: new Date(),
                        customerSnapshot: this.buildCustomerSnapshot(order),
                        billingAddressSnapshot: this.buildAddressSnapshot(order),
                        subtotal,
                        tax,
                        total,
                        currencyCode: order.currencyCode,
                        status: 'ISSUED',
                        type: 'ORDINARY',
                    }),
                );

                const lineRepo = this.connection.getRepository(txCtx, InvoiceLine);
                await lineRepo.save(lines.map(l => new InvoiceLine({ invoiceId: invoice.id, ...l })));

                return { created: true, invoice };
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                // Lost a race against a concurrent generation for the same order —
                // the whole losing transaction (including its number allocation)
                // was rolled back by the DB, so no number was wasted.
                const existing = await this.connection.getRepository(ctx, Invoice).findOne({ where: { orderId: order.id, type: 'ORDINARY' } });
                if (existing) {
                    return { created: false, invoice: existing };
                }
            }
            throw err;
        }

        if (result.created) {
            Logger.info(`Generated invoice ${result.invoice.series}-${result.invoice.number} for order ${order.code}`, loggerCtx);
            await this.registerFiscally(ctx, result.invoice);
            await this.ensurePdfFile(ctx, result.invoice);
        }
        return result;
    }

    /**
     * Factura rectificativa for a settled refund (art. 15 RD 1619/2012): own
     * series (R), negative amounts, and a reference to the invoice it
     * corrects. Idempotent per refund (unique `refundId`). Does nothing when
     * the order has no invoice (it was never paid). `order` needs
     * `lines.productVariant` and `shippingLines`; `refund` its `lines`.
     */
    async generateRectifyingForRefund(ctx: RequestContext, order: Order, refund: Refund): Promise<GenerateInvoiceResult | null> {
        const repo = this.connection.getRepository(ctx, Invoice);
        const existing = await repo.findOne({ where: { refundId: refund.id } });
        if (existing) {
            return { created: false, invoice: existing };
        }
        const original = await this.findByOrderId(ctx, order.id);
        if (!original || refund.total <= 0) {
            return null;
        }
        const { lines, subtotal, tax, total } = buildRectifyingLines(order, refund);

        let result: GenerateInvoiceResult;
        try {
            result = await this.connection.withTransaction(ctx, async txCtx => {
                const number = await this.allocateNextNumber(txCtx, RECTIFYING_INVOICE_SERIES);
                const invoice = await this.connection.getRepository(txCtx, Invoice).save(
                    new Invoice({
                        orderId: order.id,
                        orderCode: order.code,
                        customerId: original.customerId,
                        series: RECTIFYING_INVOICE_SERIES,
                        number,
                        issueDate: new Date(),
                        customerSnapshot: original.customerSnapshot,
                        billingAddressSnapshot: original.billingAddressSnapshot,
                        subtotal,
                        tax,
                        total,
                        currencyCode: original.currencyCode,
                        status: 'ISSUED',
                        type: 'RECTIFYING',
                        rectifiesInvoiceId: original.id,
                        rectifiedInvoiceNumber: formatInvoiceNumber(original),
                        rectifiedInvoiceDate: original.issueDate,
                        refundId: refund.id,
                        reason: refund.reason?.trim() || 'Devolución / reembolso de productos',
                    }),
                );
                await this.connection.getRepository(txCtx, InvoiceLine).save(lines.map(l => new InvoiceLine({ invoiceId: invoice.id, ...l })));
                return { created: true, invoice };
            });
        } catch (err) {
            if (this.isUniqueViolation(err)) {
                const raced = await repo.findOne({ where: { refundId: refund.id } });
                if (raced) {
                    return { created: false, invoice: raced };
                }
            }
            throw err;
        }

        Logger.info(`Generated rectifying invoice ${formatInvoiceNumber(result.invoice)} for refund ${refund.id} of order ${order.code}`, loggerCtx);
        await this.registerFiscally(ctx, result.invoice);
        await this.ensurePdfFile(ctx, result.invoice);
        return result;
    }

    /**
     * Veri*Factu hook: hands the issued invoice to the configured
     * FiscalRegistrationProvider (if any) and stores its answer on the
     * invoice. A failure is recorded and logged but never blocks the invoice.
     */
    private async registerFiscally(ctx: RequestContext, invoice: Invoice): Promise<void> {
        const config = getInvoicingConfig();
        const provider = config.fiscalRegistration;
        if (!provider) {
            return;
        }
        const lines = await this.getLines(ctx, invoice.id);
        const breakdown = new Map<number, { rate: number; base: number; tax: number }>();
        for (const line of lines) {
            const entry = breakdown.get(line.taxRate) ?? { rate: line.taxRate, base: 0, tax: 0 };
            entry.base += line.lineTotal - line.taxAmount;
            entry.tax += line.taxAmount;
            breakdown.set(line.taxRate, entry);
        }
        const rectifies = invoice.type === 'RECTIFYING' && invoice.rectifiedInvoiceNumber && invoice.rectifiedInvoiceDate
            ? { number: invoice.rectifiedInvoiceNumber, issueDate: invoice.rectifiedInvoiceDate, reason: invoice.reason ?? '' }
            : undefined;
        const data: FiscalInvoiceData = {
            type: invoice.type,
            number: formatInvoiceNumber(invoice),
            issueDate: invoice.issueDate,
            issuer: { name: config.storeName, taxId: config.storeTaxId },
            recipient: {
                name: invoice.billingAddressSnapshot.fullName || `${invoice.customerSnapshot.firstName} ${invoice.customerSnapshot.lastName}`.trim(),
                countryCode: invoice.billingAddressSnapshot.countryCode,
            },
            currencyCode: invoice.currencyCode,
            subtotal: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            taxBreakdown: [...breakdown.values()],
            rectifies,
        };
        try {
            const result = await provider.register(data);
            invoice.fiscalRegistration = { ...result, status: 'REGISTERED', provider: provider.name, registeredAt: new Date().toISOString() };
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`Fiscal registration (${provider.name}) failed for invoice ${data.number}: ${error}`, loggerCtx);
            invoice.fiscalRegistration = { status: 'FAILED', provider: provider.name, registeredAt: new Date().toISOString(), error };
        }
        await this.connection.getRepository(ctx, Invoice).update(invoice.id, { fiscalRegistration: invoice.fiscalRegistration });
    }

    async findById(ctx: RequestContext, id: ID): Promise<Invoice | null> {
        return (await this.connection.getRepository(ctx, Invoice).findOne({ where: { id } })) ?? null;
    }

    async findByOrderId(ctx: RequestContext, orderId: ID): Promise<Invoice | null> {
        return (await this.connection.getRepository(ctx, Invoice).findOne({ where: { orderId, type: 'ORDINARY' } })) ?? null;
    }

    async list(
        ctx: RequestContext,
        options?: { skip?: number; take?: number; search?: string; customerId?: ID },
    ): Promise<PaginatedList<Invoice>> {
        const qb = this.connection
            .getRepository(ctx, Invoice)
            .createQueryBuilder('invoice')
            .orderBy('invoice.issueDate', 'DESC')
            .skip(options?.skip ?? 0)
            .take(options?.take ?? 50);

        if (options?.customerId) {
            // Scopes the list to one customer — used by the Shop API's `myInvoices`,
            // where this is the only thing standing between a customer and every
            // other customer's invoices. Applied via `andWhere` (never `where`,
            // which would replace rather than combine) so a later `search` clause
            // can never widen the result past this customer's own rows.
            qb.andWhere('invoice.customerId = :customerId', { customerId: options.customerId });
        }

        if (options?.search) {
            // The '-' | number::text form must zero-pad to match the displayed
            // `formattedNumber` (e.g. "A-000001"), or a search for that exact
            // string would never match. Grouped in a Brackets so this OR only
            // spans the two search conditions, not the customerId filter above.
            qb.andWhere(
                new Brackets(sub => {
                    sub.where('invoice.orderCode ILIKE :search', { search: `%${options.search}%` }).orWhere(
                        "invoice.series || '-' || LPAD(invoice.number::text, 6, '0') ILIKE :search",
                        { search: `%${options.search}%` },
                    );
                }),
            );
        }

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    async getLines(ctx: RequestContext, invoiceId: ID): Promise<InvoiceLine[]> {
        return this.connection.getRepository(ctx, InvoiceLine).find({ where: { invoiceId } });
    }

    /** Absolute path to the PDF, generating it first if it's missing (e.g. a previous generation attempt failed). */
    async ensurePdfFile(ctx: RequestContext, invoice: Invoice): Promise<string> {
        const config = getInvoicingConfig();
        const fileName = `${formatInvoiceNumber(invoice)}.pdf`;
        const absolutePath = path.join(config.pdfOutputDir, fileName);

        if (invoice.pdfPath) {
            try {
                await fs.access(absolutePath);
                return absolutePath;
            } catch {
                Logger.warn(`PDF for invoice ${invoice.series}-${invoice.number} was missing on disk, regenerating`, loggerCtx);
            }
        }

        const lines = await this.getLines(ctx, invoice.id);
        const lineImages = await this.loadLineImages(lines);
        const buffer = await generateInvoicePdfBuffer(invoice, lines, config, {
            logoBuffer: LOGO_BUFFER,
            lineImages,
        });
        await fs.mkdir(config.pdfOutputDir, { recursive: true });
        await fs.writeFile(absolutePath, buffer);

        if (invoice.pdfPath !== fileName) {
            invoice.pdfPath = fileName;
            await this.connection.getRepository(ctx, Invoice).update(invoice.id, { pdfPath: fileName });
        }
        return absolutePath;
    }

    /**
     * Best-effort: a missing/unreadable image (deleted asset, storage
     * hiccup) just means that one line prints without a thumbnail — never
     * blocks generating the actual fiscal document.
     */
    private async loadLineImages(lines: InvoiceLine[]): Promise<Map<string, Buffer>> {
        const images = new Map<string, Buffer>();
        const linesWithImage = lines.filter(line => line.imagePreview);
        if (linesWithImage.length === 0) {
            return images;
        }
        const storageStrategy = this.configService.assetOptions.assetStorageStrategy;
        await Promise.all(
            linesWithImage
                .map(async line => {
                    try {
                        images.set(String(line.id), await storageStrategy.readFileToBuffer(line.imagePreview!));
                    } catch (err) {
                        Logger.warn(`Could not load image for invoice line ${line.id}: ${err}`, loggerCtx);
                    }
                }),
        );
        return images;
    }

    private buildCustomerSnapshot(order: Order): CustomerSnapshot {
        const customer = order.customer;
        return {
            customerId: String(order.customerId ?? customer?.id ?? ''),
            firstName: customer?.firstName ?? '',
            lastName: customer?.lastName ?? '',
            emailAddress: customer?.emailAddress ?? '',
            phoneNumber: customer?.phoneNumber || undefined,
        };
    }

    private buildAddressSnapshot(order: Order): AddressSnapshot {
        // Falls back to the shipping address for the (unusual) case of an order
        // with no distinct billing address set — still better than an empty invoice.
        const source = order.billingAddress?.streetLine1 ? order.billingAddress : order.shippingAddress;
        return {
            fullName: source?.fullName,
            company: source?.company,
            streetLine1: source?.streetLine1,
            streetLine2: source?.streetLine2,
            city: source?.city,
            province: source?.province,
            postalCode: source?.postalCode,
            countryCode: source?.countryCode,
            country: source?.country,
        };
    }

    /**
     * Builds one line per OrderLine plus one per ShippingLine, using each
     * line's *prorated* values — the "true economic value" per Vendure's own
     * docs, which already folds in both item-level and order-level discounts
     * (including this store's loyalty-points surcharge). This keeps the sum
     * of invoice line totals exactly equal to `order.totalWithTax` without
     * needing a separate "discount" line.
     */
    private buildLineSnapshots(order: Order): { lines: InvoiceLineData[]; subtotal: number; tax: number; total: number } {
        const lines: InvoiceLineData[] = order.lines.map(line => ({
            productName: line.productVariant.name,
            sku: line.productVariant.sku,
            quantity: line.quantity,
            unitPrice: line.proratedUnitPrice,
            taxRate: line.taxRate,
            taxAmount: line.proratedLineTax,
            lineTotal: line.proratedLinePriceWithTax,
            imagePreview: line.productVariant.product?.featuredAsset?.preview,
        }));

        for (const shippingLine of order.shippingLines) {
            lines.push({
                productName: 'Envío / Shipping',
                sku: 'SHIPPING',
                quantity: 1,
                unitPrice: shippingLine.discountedPrice,
                taxRate: shippingLine.taxRate,
                taxAmount: shippingLine.discountedPriceWithTax - shippingLine.discountedPrice,
                lineTotal: shippingLine.discountedPriceWithTax,
            });
        }

        // order.total = subTotal + shipping (excl. tax); order.totalWithTax = the final payable amount.
        const subtotal = order.total;
        const total = order.totalWithTax;
        const tax = total - subtotal;
        return { lines, subtotal, tax, total };
    }

    private async allocateNextNumber(ctx: RequestContext, series: string): Promise<number> {
        await this.ensureSequenceRow(ctx, series);
        const repo = this.connection.getRepository(ctx, InvoiceSequence);
        const result = await repo
            .createQueryBuilder()
            .update(InvoiceSequence)
            .set({ lastNumber: () => '"lastNumber" + 1' })
            .where('series = :series', { series })
            .returning(['lastNumber'])
            .execute();
        return (result.raw[0] as { lastNumber: number }).lastNumber;
    }

    private async ensureSequenceRow(ctx: RequestContext, series: string): Promise<void> {
        const repo = this.connection.getRepository(ctx, InvoiceSequence);
        const existing = await repo.findOne({ where: { series } });
        if (existing) {
            return;
        }
        try {
            await repo.save(new InvoiceSequence({ series, lastNumber: 0 }));
        } catch (err) {
            if (!this.isUniqueViolation(err)) {
                throw err;
            }
            // A concurrent call created the row first — fine, it exists now.
        }
    }

    private isUniqueViolation(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';
    }
}

/** "A-000123" — the human-readable number used everywhere (PDF, emails, API). */
export function formatInvoiceNumber(invoice: Pick<Invoice, 'series' | 'number'>): string {
    return `${invoice.series}-${String(invoice.number).padStart(6, '0')}`;
}
