import type {MessageLoaders} from '@/platform/i18n/messages';

export const collectionsMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    es: () => import('./messages/es.json'),
};
