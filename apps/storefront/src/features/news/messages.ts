import type {MessageLoaders} from '@/platform/i18n/messages';

export const newsMessageLoaders: MessageLoaders = {
    en: () => import('./messages/en.json'),
    de: () => import('./messages/de.json'),
};
