export interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}

/** A fully-rendered, provider-agnostic email ready to hand to an EmailProvider. */
export interface EmailMessage {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: EmailAttachment[];
}

export interface EmailSendResult {
    success: boolean;
    error?: string;
}

/**
 * The seam between EmailService and a concrete delivery mechanism. Swapping
 * providers (dev / smtp / a future API-based one) means adding a class that
 * implements this interface and selecting it in email-config.ts — no change
 * to EmailService or any of the call sites that trigger emails.
 */
export interface EmailProvider {
    send(message: EmailMessage): Promise<EmailSendResult>;
}

export type EmailProviderKind = 'dev' | 'smtp';

export interface EmailConfig {
    enabled: boolean;
    provider: EmailProviderKind;
    fromAddress: string;
    replyTo?: string;
    storeName: string;
    storefrontUrl: string;
    devOutputDir: string;
    smtp?: {
        host: string;
        port: number;
        secure: boolean;
        user?: string;
        password?: string;
    };
}

export interface OrderLineSummary {
    name: string;
    quantity: number;
    linePrice: string;
}

export interface OrderSummaryData {
    code: string;
    customerName: string;
    lines: OrderLineSummary[];
    total: string;
    currencyCode: string;
}

/**
 * One entry per email in EMAIL_TYPES (constants.ts). The discriminated union
 * keeps each template's required data typed at the call site, instead of a
 * loosely-typed data bag every template has to defensively destructure.
 */
export type EmailJob =
    | { type: 'registration-confirmation'; to: string; data: { customerName: string } }
    | {
          type: 'email-verification';
          to: string;
          /** needsPassword: the account was created without a password (e.g. by an admin) and the link is also where it's chosen. */
          data: { customerName: string; verificationUrl: string; needsPassword?: boolean };
      }
    | { type: 'order-received'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'payment-confirmed'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'order-cancelled'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'invoice-available'; to: string; orderId: string; data: { order: OrderSummaryData; invoiceNumber: string }; attachments?: EmailAttachment[] }
    // Deliberately a distinct type from 'invoice-available', not a resend flag on it — sendTemplate()
    // dedupes order-scoped emails by (type, orderId), and a resend (e.g. to a different address the
    // customer asked for) must never be silently skipped as "already sent".
    | { type: 'invoice-resend'; to: string; orderId: string; data: { order: OrderSummaryData; invoiceNumber: string }; attachments?: EmailAttachment[] }
    // No orderId on purpose: an order can get several rectifying invoices (one per partial refund),
    // and order-scoped emails are deduped per (type, orderId). The invoice itself is created once per refund.
    | {
          type: 'credit-note-available';
          to: string;
          data: { order: OrderSummaryData; invoiceNumber: string; rectifiedInvoiceNumber: string };
          attachments?: EmailAttachment[];
      }
    | {
          type: 'password-reset';
          to: string;
          /** isSetup: the account has no password yet (e.g. verified by an admin), so the email asks to *create* one. */
          data: { customerName: string; resetUrl: string; isSetup?: boolean };
      };

export type EmailType = EmailJob['type'];

export interface RenderedEmail {
    subject: string;
    html: string;
}
