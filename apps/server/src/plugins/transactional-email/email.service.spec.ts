import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { mock, test } from 'node:test';

process.env.EMAIL_ENABLED = 'true';
process.env.EMAIL_PROVIDER = 'dev';

/* eslint-disable @typescript-eslint/no-var-requires */
const { EmailService } = require('./email.service');
const { DevEmailProvider } = require('./providers/dev-email-provider');

const FAKE_CTX = {} as any;

// In-memory stand-in for the EmailLog repository — enough to exercise the
// dedup-then-insert logic (and its unique-constraint fallback) without a
// real database, mirroring the pattern used by loyalty.service.spec.ts.
function createFakeEmailLogRepository() {
    const rows: any[] = [];
    let nextId = 1;
    return {
        rows,
        findOne: mock.fn(async ({ where }: { where: any }) => {
            return rows.find(r => r.type === where.type && r.orderId === where.orderId && (where.success === undefined || r.success === where.success)) ?? null;
        }),
        save: mock.fn(async (row: any) => {
            if (row.orderId && row.success) {
                const dup = rows.find(r => r.type === row.type && r.orderId === row.orderId && r.success);
                if (dup) {
                    const err: any = new Error('duplicate key value violates unique constraint');
                    err.code = '23505';
                    throw err;
                }
            }
            row.id = nextId++;
            rows.push(row);
            return row;
        }),
    };
}

function createService(providerImpl: { send: (msg: any) => Promise<any> }) {
    const fakeRepo = createFakeEmailLogRepository();
    const connectionMock = { getRepository: () => fakeRepo };
    const service = new EmailService(connectionMock, providerImpl);
    return { service, fakeRepo };
}

test('registration/verification email is sent and logged', async () => {
    const sends: any[] = [];
    const { service, fakeRepo } = createService({
        send: async (msg: any) => {
            sends.push(msg);
            return { success: true };
        },
    });

    const result = await service.sendTemplate(FAKE_CTX, {
        type: 'email-verification',
        to: 'new-customer@example.com',
        data: { customerName: 'Ana', verificationUrl: 'http://localhost:3001/verify?token=abc' },
    });

    assert.equal(result.success, true);
    assert.equal(sends.length, 1);
    assert.equal(sends[0].to, 'new-customer@example.com');
    assert.match(sends[0].html, /abc/);
    assert.equal(fakeRepo.rows.length, 1);
    assert.equal(fakeRepo.rows[0].success, true);
});

test('order-received email is sent once per order and deduped on retry', async () => {
    const sends: any[] = [];
    const { service, fakeRepo } = createService({
        send: async (msg: any) => {
            sends.push(msg);
            return { success: true };
        },
    });
    const job = {
        type: 'order-received',
        to: 'customer@example.com',
        orderId: '42',
        data: { order: { code: 'ABC123', customerName: 'Ana', lines: [{ name: 'ISO SAVAGE', quantity: 1, linePrice: '24.99 EUR' }], total: '24.99 EUR', currencyCode: 'EUR' } },
    };

    const first = await service.sendTemplate(FAKE_CTX, job);
    const second = await service.sendTemplate(FAKE_CTX, job);

    assert.equal(first.success, true);
    assert.equal(second.success, true);
    assert.equal(sends.length, 1, 'the provider should only be called once — the retry is deduped before rendering');
    assert.equal(fakeRepo.rows.length, 1);
});

test('payment-confirmed email is sent for a settled order', async () => {
    const sends: any[] = [];
    const { service } = createService({
        send: async (msg: any) => {
            sends.push(msg);
            return { success: true };
        },
    });

    const result = await service.sendTemplate(FAKE_CTX, {
        type: 'payment-confirmed',
        to: 'customer@example.com',
        orderId: '99',
        data: { order: { code: 'XYZ999', customerName: 'Luis', lines: [], total: '10.00 EUR', currencyCode: 'EUR' } },
    });

    assert.equal(result.success, true);
    assert.match(sends[0].subject, /XYZ999/);
});

test('invoice-available email carries the PDF as an attachment', async () => {
    const sends: any[] = [];
    const { service } = createService({
        send: async (msg: any) => {
            sends.push(msg);
            return { success: true };
        },
    });

    const pdfBuffer = Buffer.from('%PDF-1.4 fake invoice content');
    const result = await service.sendTemplate(FAKE_CTX, {
        type: 'invoice-available',
        to: 'customer@example.com',
        orderId: '7',
        data: { order: { code: 'INV001', customerName: 'Marta', lines: [], total: '50.00 EUR', currencyCode: 'EUR' }, invoiceNumber: 'A-000007' },
        attachments: [{ filename: 'Factura-A-000007.pdf', content: pdfBuffer, contentType: 'application/pdf' }],
    });

    assert.equal(result.success, true);
    assert.equal(sends[0].attachments.length, 1);
    assert.equal(sends[0].attachments[0].filename, 'Factura-A-000007.pdf');
    assert.equal(sends[0].attachments[0].content, pdfBuffer);
});

test('a provider failure is reported but never thrown, and is logged', async () => {
    const { service, fakeRepo } = createService({
        send: async () => {
            throw new Error('SMTP connection refused');
        },
    });

    const result = await service.sendTemplate(FAKE_CTX, {
        type: 'password-reset',
        to: 'customer@example.com',
        data: { customerName: 'Ana', resetUrl: 'http://localhost:3001/reset-password?token=xyz' },
    });

    assert.equal(result.success, false);
    assert.match(result.error, /SMTP connection refused/);
    assert.equal(fakeRepo.rows[0].success, false);
});

test('DevEmailProvider never delivers a real email — it writes the rendered HTML to disk for inspection', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'email-test-'));
    try {
        const provider = new DevEmailProvider(outputDir);
        const result = await provider.send({
            to: 'someone@example.com',
            subject: 'Test subject',
            html: '<p>hello</p>',
        });

        assert.equal(result.success, true);
        const files = await fs.readdir(outputDir);
        assert.equal(files.length, 1);
        const content = await fs.readFile(path.join(outputDir, files[0]), 'utf8');
        assert.match(content, /someone@example.com/);
        assert.match(content, /<p>hello<\/p>/);
    } finally {
        await fs.rm(outputDir, { recursive: true, force: true });
    }
});
