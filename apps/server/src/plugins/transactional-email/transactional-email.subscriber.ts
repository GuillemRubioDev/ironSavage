import { promises as fs } from 'fs';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    AccountRegistrationEvent,
    AccountVerifiedEvent,
    CustomerService,
    EventBus,
    Logger,
    Order,
    OrderService,
    OrderState,
    OrderStateTransitionEvent,
    PasswordResetEvent,
    TransactionalConnection,
} from '@vendure/core';
import { userHasPassword } from '../customer-accounts/user-has-password';
import { InvoiceGeneratedEvent, InvoiceResendRequestedEvent } from '../invoicing/invoicing.plugin';

import { loggerCtx } from './constants';
import { getEmailConfig } from './email-config';
import { EmailService } from './email.service';
import type { EmailJob, OrderSummaryData } from './types';

function formatMoney(cents: number, currencyCode: string): string {
    return `${(cents / 100).toFixed(2)} ${currencyCode}`;
}

/**
 * Conecta los eventos de Vendure directamente con EmailService: es el único sitio del
 * plugin que sabe qué evento corresponde a qué email. Cada handler está protegido
 * para que nada de lo que haga pueda lanzar errores al EventBus: cuando se ejecutan,
 * la transacción que los provocó ya está confirmada (`eventBus.ofType()` solo entrega
 * después del commit), así que un fallo aquí nunca puede hacer fallar un pedido, un
 * registro o una petición de restablecimiento; solo puede fallar el *aviso*, y por
 * eso todo camino queda en el log.
 */
@Injectable()
export class TransactionalEmailSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private emailService: EmailService,
        private orderService: OrderService,
        private customerService: CustomerService,
        private connection: TransactionalConnection,
    ) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(AccountRegistrationEvent).subscribe(event => this.guard('email-verification', () => this.onAccountRegistration(event)));
        this.eventBus.ofType(AccountVerifiedEvent).subscribe(event => this.guard('registration-confirmation', () => this.onAccountVerified(event)));
        this.eventBus.ofType(PasswordResetEvent).subscribe(event => this.guard('password-reset', () => this.onPasswordReset(event)));
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => this.guard('order-transition', () => this.onOrderStateTransition(event)));
        this.eventBus.ofType(InvoiceGeneratedEvent).subscribe(event => this.guard('invoice-available', () => this.onInvoiceGenerated(event)));
        this.eventBus.ofType(InvoiceResendRequestedEvent).subscribe(event => this.guard('invoice-resend', () => this.onInvoiceResendRequested(event)));
    }

    private async guard(label: string, work: () => Promise<void>): Promise<void> {
        try {
            await work();
        } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            Logger.error(`Unhandled error while processing "${label}" email trigger: ${error}`, loggerCtx);
        }
    }

    private async onAccountRegistration(event: AccountRegistrationEvent): Promise<void> {
        const identifier = event.user.getNativeAuthenticationMethod().identifier;
        const verificationToken = event.user.getNativeAuthenticationMethod().verificationToken;
        if (!identifier || !verificationToken) {
            return;
        }
        const customer = await this.customerService.findOneByUserId(event.ctx, event.user.id);
        const config = getEmailConfig();
        const job: EmailJob = {
            type: 'email-verification',
            to: identifier,
            data: {
                customerName: customer?.firstName || identifier,
                verificationUrl: `${config.storefrontUrl}/verify?token=${encodeURIComponent(verificationToken)}`,
                // Las cuentas creadas sin contraseña la eligen desde este mismo enlace.
                needsPassword: !(await userHasPassword(this.connection, event.ctx, event.user.id)),
            },
        };
        await this.emailService.sendTemplate(event.ctx, job);
    }

    private async onAccountVerified(event: AccountVerifiedEvent): Promise<void> {
        const job: EmailJob = {
            type: 'registration-confirmation',
            to: event.customer.emailAddress,
            data: { customerName: event.customer.firstName || event.customer.emailAddress },
        };
        await this.emailService.sendTemplate(event.ctx, job);
    }

    private async onPasswordReset(event: PasswordResetEvent): Promise<void> {
        const identifier = event.user.getNativeAuthenticationMethod().identifier;
        const resetToken = event.user.getNativeAuthenticationMethod().passwordResetToken;
        if (!identifier || !resetToken) {
            return;
        }
        const customer = await this.customerService.findOneByUserId(event.ctx, event.user.id);
        const config = getEmailConfig();
        const job: EmailJob = {
            type: 'password-reset',
            to: identifier,
            data: {
                customerName: customer?.firstName || identifier,
                resetUrl: `${config.storefrontUrl}/reset-password?token=${encodeURIComponent(resetToken)}`,
                isSetup: !(await userHasPassword(this.connection, event.ctx, event.user.id)),
            },
        };
        await this.emailService.sendTemplate(event.ctx, job);
    }

    private async onOrderStateTransition(event: OrderStateTransitionEvent): Promise<void> {
        const type = this.mapOrderTransitionToEmailType(event.toState);
        if (!type) {
            return;
        }
        const order = await this.orderService.findOne(event.ctx, event.order.id, ['lines.productVariant', 'customer']);
        if (!order || !order.customer) {
            return;
        }
        const job: EmailJob = {
            type,
            to: order.customer.emailAddress,
            orderId: String(order.id),
            data: { order: this.buildOrderSummary(order) },
        };
        await this.emailService.sendTemplate(event.ctx, job);
    }

    private mapOrderTransitionToEmailType(toState: OrderState): 'order-received' | 'payment-confirmed' | 'order-cancelled' | null {
        if (toState === 'ArrangingPayment') return 'order-received';
        if (toState === 'PaymentSettled') return 'payment-confirmed';
        if (toState === 'Cancelled') return 'order-cancelled';
        return null;
    }

    private async onInvoiceGenerated(event: InvoiceGeneratedEvent): Promise<void> {
        if (!event.invoice.customerSnapshot.emailAddress) {
            return;
        }
        if (event.invoice.type === 'RECTIFYING') {
            await this.sendCreditNoteEmail(event);
            return;
        }
        await this.sendInvoiceEmail(
            event.ctx,
            event.invoice,
            event.lines,
            event.pdfPath,
            event.invoice.customerSnapshot.emailAddress,
            'invoice-available',
        );
    }

    /**
     * El mismo email que onInvoiceGenerated(), pero a la dirección que escribió el
     * administrador; ver InvoiceResendRequestedEvent. Usa el tipo propio
     * 'invoice-resend' y se salta por completo la deduplicación por pedido: es una
     * acción deliberada y repetible (puede reenviarse a varias direcciones), no un
     * reintento del envío automático original.
     */
    private async onInvoiceResendRequested(event: InvoiceResendRequestedEvent): Promise<void> {
        await this.sendInvoiceEmail(event.ctx, event.invoice, event.lines, event.pdfPath, event.toEmail, 'invoice-resend');
    }

    private async sendCreditNoteEmail(event: InvoiceGeneratedEvent): Promise<void> {
        const { invoice, lines } = event;
        const invoiceNumber = `${invoice.series}-${String(invoice.number).padStart(6, '0')}`;
        const pdfBuffer = await fs.readFile(event.pdfPath);
        const order: OrderSummaryData = {
            code: invoice.orderCode,
            customerName: `${invoice.customerSnapshot.firstName} ${invoice.customerSnapshot.lastName}`.trim() || invoice.customerSnapshot.emailAddress,
            lines: lines.map(l => ({ name: l.productName, quantity: l.quantity, linePrice: formatMoney(l.lineTotal, invoice.currencyCode) })),
            // Se muestra como importe reembolsado, en positivo, como lo entiende el cliente.
            total: formatMoney(Math.abs(invoice.total), invoice.currencyCode),
            currencyCode: invoice.currencyCode,
        };
        await this.emailService.sendTemplate(event.ctx, {
            type: 'credit-note-available',
            to: invoice.customerSnapshot.emailAddress,
            data: { order, invoiceNumber, rectifiedInvoiceNumber: invoice.rectifiedInvoiceNumber ?? '' },
            attachments: [{ filename: `Factura-rectificativa-${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
        });
    }

    private async sendInvoiceEmail(
        ctx: InvoiceGeneratedEvent['ctx'],
        invoice: InvoiceGeneratedEvent['invoice'],
        lines: InvoiceGeneratedEvent['lines'],
        pdfPath: string,
        toEmail: string,
        type: 'invoice-available' | 'invoice-resend',
    ): Promise<void> {
        const pdfBuffer = await fs.readFile(pdfPath);
        const invoiceNumber = `${invoice.series}-${String(invoice.number).padStart(6, '0')}`;

        const order: OrderSummaryData = {
            code: invoice.orderCode,
            customerName: `${invoice.customerSnapshot.firstName} ${invoice.customerSnapshot.lastName}`.trim() || invoice.customerSnapshot.emailAddress,
            lines: lines.map(l => ({
                name: l.productName,
                quantity: l.quantity,
                linePrice: formatMoney(l.lineTotal, invoice.currencyCode),
            })),
            total: formatMoney(invoice.total, invoice.currencyCode),
            currencyCode: invoice.currencyCode,
        };

        const job: EmailJob = {
            type,
            to: toEmail,
            orderId: String(invoice.orderId),
            data: { order, invoiceNumber },
            attachments: [{ filename: `Factura-${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
        };
        await this.emailService.sendTemplate(ctx, job, { skipDedupCheck: type === 'invoice-resend' });
    }

    private buildOrderSummary(order: Order): OrderSummaryData {
        return {
            code: order.code,
            customerName: `${order.customer?.firstName ?? ''} ${order.customer?.lastName ?? ''}`.trim() || order.customer!.emailAddress,
            lines: order.lines.map(line => ({
                name: line.productVariant.name,
                quantity: line.quantity,
                linePrice: formatMoney(line.linePriceWithTax, order.currencyCode),
            })),
            total: formatMoney(order.totalWithTax, order.currencyCode),
            currencyCode: order.currencyCode,
        };
    }
}
