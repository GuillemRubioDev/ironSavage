import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';

/* eslint-disable @typescript-eslint/no-var-requires */
const { InvoicingService } = require('./invoicing.service');
const { Invoice } = require('./invoice.entity');
const { InvoiceLine } = require('./invoice-line.entity');
const { InvoiceSequence } = require('./invoice-sequence.entity');
const { setInvoicingConfig } = require('./invoicing-config');

const pdfOutputDir = path.join(os.tmpdir(), `invoicing-spec-${Date.now()}`);
setInvoicingConfig({
    storeName: 'Test Store SL',
    storeTaxId: 'B12345678',
    storeAddress: 'Calle Test 1, 28001 Madrid',
    storeEmail: 'facturacion@test.example',
    pdfOutputDir,
});

after(async () => {
    await fs.rm(pdfOutputDir, { recursive: true, force: true });
});

/** Duck-typed Order mock: InvoicingService only ever reads plain properties, never `instanceof Order`. */
function createTestOrder(overrides: Record<string, unknown> = {}) {
    return {
        id: '1',
        code: 'TESTORDER1',
        customerId: 'cust-1',
        customer: { id: 'cust-1', firstName: 'Ana', lastName: 'Garcia', emailAddress: 'ana@example.com', phoneNumber: '600111222' },
        currencyCode: 'EUR',
        billingAddress: {
            fullName: 'Ana Garcia',
            streetLine1: 'Calle Mayor 1',
            city: 'Madrid',
            postalCode: '28001',
            countryCode: 'ES',
            country: 'Espana',
        },
        shippingAddress: { fullName: 'Ana Garcia', streetLine1: 'Calle Mayor 1', city: 'Madrid', postalCode: '28001' },
        lines: [
            {
                productVariant: { name: 'Whey Protein 1kg', sku: 'WHEY-1KG' },
                quantity: 2,
                proratedUnitPrice: 2000,
                taxRate: 21,
                proratedLineTax: 840,
                proratedLinePriceWithTax: 4840,
            },
        ],
        shippingLines: [{ discountedPrice: 500, discountedPriceWithTax: 605, taxRate: 21 }],
        total: 4500, // (2000 * 2) + 500, excl. tax
        totalWithTax: 5445, // 4840 + 605
        ...overrides,
    };
}

function createFakeDb() {
    const invoices = new Map<string, any>();
    const invoiceLines: any[] = [];
    const sequences = new Map<string, any>();
    let nextInvoiceId = 1;
    let nextLineId = 1;
    let nextSequenceId = 1;

    const invoiceRepo = {
        findOne: async ({ where }: { where: Record<string, unknown> }) => {
            for (const invoice of invoices.values()) {
                if (Object.entries(where).every(([k, v]) => String(invoice[k]) === String(v))) return invoice;
            }
            return null;
        },
        save: async (input: any) => {
            for (const invoice of invoices.values()) {
                if (String(invoice.orderId) === String(input.orderId)) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
                if (invoice.series === input.series && invoice.number === input.number) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
            }
            const invoice = { id: String(nextInvoiceId++), createdAt: new Date(), ...input };
            invoices.set(invoice.id, invoice);
            return invoice;
        },
        update: async (id: string, patch: Record<string, unknown>) => {
            const invoice = invoices.get(String(id));
            if (invoice) Object.assign(invoice, patch);
        },
    };

    const lineRepo = {
        find: async ({ where }: { where: Record<string, unknown> }) =>
            invoiceLines.filter(l => Object.entries(where).every(([k, v]) => String(l[k]) === String(v))),
        save: async (input: any) => {
            const rows = Array.isArray(input) ? input : [input];
            const saved = rows.map(r => ({ id: String(nextLineId++), createdAt: new Date(), ...r }));
            invoiceLines.push(...saved);
            return Array.isArray(input) ? saved : saved[0];
        },
    };

    const sequenceRepo = {
        findOne: async ({ where }: { where: { series: string } }) => sequences.get(where.series) ?? null,
        save: async (input: any) => {
            if (sequences.has(input.series)) {
                const err: any = new Error('duplicate key value violates unique constraint');
                err.code = '23505';
                throw err;
            }
            const row = { id: String(nextSequenceId++), createdAt: new Date(), ...input };
            sequences.set(row.series, row);
            return row;
        },
        createQueryBuilder: () => {
            const params: Record<string, unknown> = {};
            const builder = {
                update: () => builder,
                set: () => builder,
                where: (_cond: string, whereParams?: Record<string, unknown>) => {
                    Object.assign(params, whereParams);
                    return builder;
                },
                returning: () => builder,
                execute: async () => {
                    const row = sequences.get(params.series as string);
                    row.lastNumber += 1;
                    return { raw: [{ lastNumber: row.lastNumber }] };
                },
            };
            return builder;
        },
    };

    return { invoices, invoiceLines, sequences, invoiceRepo, lineRepo, sequenceRepo };
}

function createService() {
    const db = createFakeDb();
    let mutex: Promise<unknown> = Promise.resolve();
    const connectionMock = {
        getRepository: (_ctx: unknown, Entity: unknown) => {
            if (Entity === Invoice) return db.invoiceRepo;
            if (Entity === InvoiceLine) return db.lineRepo;
            if (Entity === InvoiceSequence) return db.sequenceRepo;
            throw new Error('unexpected entity');
        },
        withTransaction: async (ctx: unknown, work: (ctx: unknown) => Promise<unknown>) => {
            const run = async () => work(ctx);
            const result = mutex.then(run, run);
            mutex = result.catch(() => undefined);
            return result;
        },
    };
    return { service: new InvoicingService(connectionMock), db };
}

test('generating an invoice for a settled order captures correct totals and tax', async () => {
    const { service } = createService();
    const order = createTestOrder();

    const result = await service.generateForOrder({}, order);

    assert.equal(result.created, true);
    assert.equal(result.invoice.series, 'A');
    assert.equal(result.invoice.number, 1);
    assert.equal(result.invoice.subtotal, 4500);
    assert.equal(result.invoice.tax, 945);
    assert.equal(result.invoice.total, 5445);
    assert.equal(result.invoice.currencyCode, 'EUR');
});

test('invoice lines snapshot product/SKU/tax data, plus a shipping line', async () => {
    const { service, db } = createService();
    const order = createTestOrder({ id: '2', code: 'TESTORDER2' });

    const result = await service.generateForOrder({}, order);
    const lines = await db.lineRepo.find({ where: { invoiceId: result.invoice.id } });

    assert.equal(lines.length, 2);
    const productLine = lines.find((l: any) => l.sku === 'WHEY-1KG');
    assert.equal(productLine.productName, 'Whey Protein 1kg');
    assert.equal(productLine.quantity, 2);
    assert.equal(productLine.unitPrice, 2000);
    assert.equal(productLine.taxRate, 21);
    assert.equal(productLine.taxAmount, 840);
    assert.equal(productLine.lineTotal, 4840);

    const shippingLine = lines.find((l: any) => l.sku === 'SHIPPING');
    assert.equal(shippingLine.unitPrice, 500);
    assert.equal(shippingLine.taxAmount, 105);
    assert.equal(shippingLine.lineTotal, 605);
});

test('a duplicate PaymentSettled event does not create a second invoice', async () => {
    const { service, db } = createService();
    const order = createTestOrder({ id: '3', code: 'TESTORDER3' });

    const first = await service.generateForOrder({}, order);
    const second = await service.generateForOrder({}, order);

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(second.invoice.id, first.invoice.id);
    assert.equal(db.invoices.size, 1);
});

test('invoice numbers are sequential per series and never collide, even generated concurrently', async () => {
    const { service, db } = createService();
    const orderA = createTestOrder({ id: '4', code: 'TESTORDER4' });
    const orderB = createTestOrder({ id: '5', code: 'TESTORDER5' });
    const orderC = createTestOrder({ id: '6', code: 'TESTORDER6' });

    const [r1, r2, r3] = await Promise.all([
        service.generateForOrder({}, orderA),
        service.generateForOrder({}, orderB),
        service.generateForOrder({}, orderC),
    ]);

    const numbers = [r1, r2, r3].map(r => r.invoice.number).sort((a, b) => a - b);
    assert.deepEqual(numbers, [1, 2, 3]);
    assert.equal(new Set(numbers).size, 3);
    assert.equal(db.sequences.get('A').lastNumber, 3);
});

test('captures a frozen snapshot of customer and billing address data', async () => {
    const { service } = createService();
    const order = createTestOrder({ id: '7', code: 'TESTORDER7' });

    const result = await service.generateForOrder({}, order);

    assert.deepEqual(result.invoice.customerSnapshot, {
        customerId: 'cust-1',
        firstName: 'Ana',
        lastName: 'Garcia',
        emailAddress: 'ana@example.com',
        phoneNumber: '600111222',
    });
    assert.equal(result.invoice.billingAddressSnapshot.fullName, 'Ana Garcia');
    assert.equal(result.invoice.billingAddressSnapshot.streetLine1, 'Calle Mayor 1');
    assert.equal(result.invoice.billingAddressSnapshot.postalCode, '28001');
});

test('generates a real PDF file on disk for the invoice', async () => {
    const { service } = createService();
    const order = createTestOrder({ id: '8', code: 'TESTORDER8' });

    const result = await service.generateForOrder({}, order);

    assert.ok(result.invoice.pdfPath, 'expected pdfPath to be set');
    const filePath = path.join(pdfOutputDir, result.invoice.pdfPath);
    const buffer = await fs.readFile(filePath);
    assert.ok(buffer.length > 100, 'expected a non-trivial PDF file');
    assert.equal(buffer.subarray(0, 5).toString('ascii'), '%PDF-');
});
