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
} from '@vendure/core';
import { InvoiceGeneratedEvent } from '../invoicing/invoicing.plugin';

import { loggerCtx } from './constants';
import { getEmailConfig } from './email-config';
import { EmailService } from './email.service';
import type { EmailJob, OrderSummaryData } from './types';

function formatMoney(cents: number, currencyCode: string): string {
    return `${(cents / 100).toFixed(2)} ${currencyCode}`;
}

/**
 * Wires Vendure's own domain events straight to EmailService — this is the
 * only place in the plugin that knows which event maps to which email.
 * Every handler is wrapped so nothing it does can throw back into the
 * EventBus: by the time these fire the triggering transaction has already
 * committed (`eventBus.ofType()` only delivers post-commit), so a failure
 * here can never fail an order, a registration, or a password-reset request
 * — it can only fail to *notify* about one, which is why every path is
 * logged.
 */
@Injectable()
export class TransactionalEmailSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private emailService: EmailService,
        private orderService: OrderService,
        private customerService: CustomerService,
    ) {}

    onApplicationBootstrap(): void {
        this.eventBus.ofType(AccountRegistrationEvent).subscribe(event => this.guard('email-verification', () => this.onAccountRegistration(event)));
        this.eventBus.ofType(AccountVerifiedEvent).subscribe(event => this.guard('registration-confirmation', () => this.onAccountVerified(event)));
        this.eventBus.ofType(PasswordResetEvent).subscribe(event => this.guard('password-reset', () => this.onPasswordReset(event)));
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => this.guard('order-transition', () => this.onOrderStateTransition(event)));
        this.eventBus.ofType(InvoiceGeneratedEvent).subscribe(event => this.guard('invoice-available', () => this.onInvoiceGenerated(event)));
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
        const { invoice, lines } = event;
        if (!invoice.customerSnapshot.emailAddress) {
            return;
        }
        const pdfBuffer = await fs.readFile(event.pdfPath);
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
            type: 'invoice-available',
            to: invoice.customerSnapshot.emailAddress,
            orderId: String(invoice.orderId),
            data: { order, invoiceNumber },
            attachments: [{ filename: `Factura-${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
        };
        await this.emailService.sendTemplate(event.ctx, job);
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
