import type {MessageLoaders} from '@/platform/i18n/messages';

export const invoicesMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    es: () => import('./messages/es.json'),
};
