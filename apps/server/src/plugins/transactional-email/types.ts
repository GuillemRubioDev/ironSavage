export interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}

/** Un email ya generado, independiente del proveedor, listo para entregar a un EmailProvider. */
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
 * La frontera entre EmailService y un mecanismo de envío concreto. Cambiar de
 * proveedor (dev / smtp / uno futuro por API) consiste en añadir una clase que
 * implemente esta interfaz y elegirla en email-config.ts, sin tocar EmailService ni
 * ningún sitio que dispare emails.
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
 * Una entrada por email de EMAIL_TYPES (constants.ts). La unión discriminada mantiene
 * tipados en cada llamada los datos que necesita cada plantilla, en vez de una bolsa
 * de datos sin tipo que cada plantilla tendría que desestructurar con cuidado.
 */
export type EmailJob =
    | { type: 'registration-confirmation'; to: string; data: { customerName: string } }
    | {
          type: 'email-verification';
          to: string;
          /** needsPassword: la cuenta se creó sin contraseña (p. ej. por un administrador) y el enlace sirve también para elegirla. */
          data: { customerName: string; verificationUrl: string; needsPassword?: boolean };
      }
    | { type: 'order-received'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'payment-confirmed'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'order-cancelled'; to: string; orderId: string; data: { order: OrderSummaryData } }
    | { type: 'invoice-available'; to: string; orderId: string; data: { order: OrderSummaryData; invoiceNumber: string }; attachments?: EmailAttachment[] }
    // A propósito es un tipo distinto de 'invoice-available' y no una marca de reenvío: sendTemplate()
    // deduplica los emails de pedido por (tipo, orderId), y un reenvío (p. ej. a otra dirección que pidió
    // el cliente) nunca debe descartarse en silencio como «ya enviado».
    | { type: 'invoice-resend'; to: string; orderId: string; data: { order: OrderSummaryData; invoiceNumber: string }; attachments?: EmailAttachment[] }
    // Sin orderId a propósito: un pedido puede tener varias rectificativas (una por reembolso parcial) y los
    // emails de pedido se deduplican por (tipo, orderId). La factura en sí se crea una vez por reembolso.
    | {
          type: 'credit-note-available';
          to: string;
          data: { order: OrderSummaryData; invoiceNumber: string; rectifiedInvoiceNumber: string };
          attachments?: EmailAttachment[];
      }
    | {
          type: 'password-reset';
          to: string;
          /** isSetup: la cuenta aún no tiene contraseña (p. ej. la verificó un administrador), así que el email pide *crearla*. */
          data: { customerName: string; resetUrl: string; isSetup?: boolean };
      };

export type EmailType = EmailJob['type'];

export interface RenderedEmail {
    subject: string;
    html: string;
}
