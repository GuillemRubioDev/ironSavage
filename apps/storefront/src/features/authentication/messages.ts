import type {MessageLoaders} from '@/platform/i18n/messages';

export const authenticationMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    es: () => import('./messages/es.json'),
};
