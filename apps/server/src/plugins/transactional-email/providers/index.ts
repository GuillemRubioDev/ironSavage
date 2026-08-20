import type { EmailConfig, EmailProvider } from '../types';
import { DevEmailProvider } from './dev-email-provider';
import { SmtpEmailProvider } from './smtp-email-provider';

export { DevEmailProvider } from './dev-email-provider';
export { SmtpEmailProvider } from './smtp-email-provider';

export function createEmailProvider(config: EmailConfig): EmailProvider {
    if (config.provider === 'smtp' && config.smtp) {
        return new SmtpEmailProvider(config.smtp);
    }
    return new DevEmailProvider(config.devOutputDir);
}
