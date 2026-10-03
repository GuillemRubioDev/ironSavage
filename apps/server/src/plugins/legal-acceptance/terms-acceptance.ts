import { CustomFieldConfig, LanguageCode, OrderProcess } from '@vendure/core';

/**
 * Version of the storefront's legal texts, as sent by the storefront: the
 * date they were last updated (LEGAL_VERSION in apps/storefront/src/config/legal.ts).
 */
export const TERMS_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTermsVersion(version: unknown): version is string {
    if (typeof version !== 'string' || !TERMS_VERSION_PATTERN.test(version)) {
        return false;
    }
    const date = new Date(`${version}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(version);
}

/**
 * Evidence of the customer's acceptance of the general terms, stored on the
 * order itself. `readonly`: no API (shop or admin) can write them — only
 * `acceptTermsForActiveOrder`, which stamps the server's own clock. Not
 * `public`: the Shop API doesn't expose them; the Dashboard shows them on the
 * order detail page.
 */
export const orderTermsCustomFields: CustomFieldConfig[] = [
    {
        name: 'termsAcceptedAt',
        type: 'datetime',
        nullable: true,
        readonly: true,
        public: false,
        label: [
            { languageCode: LanguageCode.en, value: 'Terms accepted at' },
            { languageCode: LanguageCode.es, value: 'Condiciones aceptadas el' },
        ],
        description: [
            {
                languageCode: LanguageCode.en,
                value: 'When the customer accepted the terms and conditions, just before paying (server time).',
            },
            {
                languageCode: LanguageCode.es,
                value: 'Cuándo aceptó el cliente los términos y condiciones, justo antes de pagar (hora del servidor).',
            },
        ],
    },
    {
        name: 'termsVersion',
        type: 'string',
        nullable: true,
        readonly: true,
        public: false,
        label: [
            { languageCode: LanguageCode.en, value: 'Terms version' },
            { languageCode: LanguageCode.es, value: 'Versión de las condiciones' },
        ],
        description: [
            {
                languageCode: LanguageCode.en,
                value: 'The "last updated" date of the legal texts the customer accepted.',
            },
            {
                languageCode: LanguageCode.es,
                value: 'Fecha de «última actualización» de los textos legales que aceptó el cliente.',
            },
        ],
    },
];

export const TERMS_NOT_ACCEPTED_MESSAGE =
    'The terms and conditions must be accepted before paying (acceptTermsForActiveOrder)';

/**
 * Server-side guarantee that every order placed from the storefront carries
 * the acceptance record: the Shop API cannot move an order to payment
 * without it. Orders created by an administrator (draft orders, Admin API)
 * are not affected.
 */
export const termsAcceptanceOrderProcess: OrderProcess<never> = {
    onTransitionStart(fromState, toState, { ctx, order }) {
        if (ctx.apiType !== 'shop' || fromState !== 'AddingItems' || toState !== 'ArrangingPayment') {
            return;
        }
        if (!order.customFields?.termsAcceptedAt || !order.customFields?.termsVersion) {
            return TERMS_NOT_ACCEPTED_MESSAGE;
        }
    },
};

declare module '@vendure/core/dist/entity/custom-entity-fields' {
    interface CustomOrderFields {
        termsAcceptedAt?: Date | null;
        termsVersion?: string | null;
    }
}
