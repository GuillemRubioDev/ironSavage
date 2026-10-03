import { CustomFieldConfig, LanguageCode, OrderProcess } from '@vendure/core';

/**
 * Versión de los textos legales de la tienda, tal como la envía el storefront: la
 * fecha de su última actualización (LEGAL_VERSION en apps/storefront/src/config/legal.ts).
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
 * Prueba de que el cliente aceptó las condiciones generales, guardada en el propio
 * pedido. `readonly`: ninguna API (tienda ni administración) puede escribirlos,
 * solo `acceptTermsForActiveOrder`, que pone la hora del servidor. No son
 * `public`: la Shop API no los expone; el dashboard los muestra en la ficha del pedido.
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
 * Garantía en el servidor de que todo pedido hecho desde la tienda lleva el
 * registro de aceptación: la Shop API no puede pasar un pedido a pago sin él. No
 * afecta a los pedidos creados por un administrador (borradores, Admin API).
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
