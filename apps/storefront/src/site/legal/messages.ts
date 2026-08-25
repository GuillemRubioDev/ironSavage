import type {MessageLoaders} from '@/platform/i18n/messages';

export const legalMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    es: () => import('./messages/es.json'),
};
