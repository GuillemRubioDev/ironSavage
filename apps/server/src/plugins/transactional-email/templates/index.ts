import type { EmailConfig, EmailJob, RenderedEmail } from '../types';
import { renderRegistrationConfirmation } from './registration-confirmation';
import { renderEmailVerification } from './email-verification';
import { renderOrderReceived } from './order-received';
import { renderPaymentConfirmed } from './payment-confirmed';
import { renderOrderCancelled } from './order-cancelled';
import { renderInvoiceAvailable } from './invoice-available';
import { renderInvoiceResend } from './invoice-resend';
import { renderCreditNoteAvailable } from './credit-note-available';
import { renderPasswordReset } from './password-reset';

/** El único sitio que sabe convertir un EmailJob en asunto + HTML. Para añadir un tipo de email, hazlo aquí y en EmailJob (types.ts). */
export function renderEmailJob(config: EmailConfig, job: EmailJob): RenderedEmail {
    switch (job.type) {
        case 'registration-confirmation':
            return renderRegistrationConfirmation(config, job.data);
        case 'email-verification':
            return renderEmailVerification(config, job.data);
        case 'order-received':
            return renderOrderReceived(config, job.data);
        case 'payment-confirmed':
            return renderPaymentConfirmed(config, job.data);
        case 'order-cancelled':
            return renderOrderCancelled(config, job.data);
        case 'invoice-available':
            return renderInvoiceAvailable(config, job.data);
        case 'invoice-resend':
            return renderInvoiceResend(config, job.data);
        case 'credit-note-available':
            return renderCreditNoteAvailable(config, job.data);
        case 'password-reset':
            return renderPasswordReset(config, job.data);
    }
}
