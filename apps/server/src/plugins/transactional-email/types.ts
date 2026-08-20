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
    | { type: 'email-verification'; to: string; data: { customerName: string; verificationUrl: string } }
    | { type: 'order-received'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'payment-confirmed'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'order-cancelled'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'invoice-available'; to: string; orderId: string; data: { order: OrderSummaryData; invoiceNumber: string }; attachments?: EmailAttachment[] }
    | { type: 'password-reset'; to: string; data: { customerName: string; resetUrl: string } };

export type EmailType = EmailJob['type'];

export interface RenderedEmail {
    subject: string;
    html: string;
}
