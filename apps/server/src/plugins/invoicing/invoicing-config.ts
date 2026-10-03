import path from 'path';
import { Logger } from '@vendure/core';

import { loggerCtx } from './constants';
import type { InvoicingConfig, InvoicingPluginOptions } from './types';

let cached: InvoicingConfig | undefined;

/**
 * La identidad fiscal de la tienda es configuración de negocio/legal (como las
 * reglas del programa de fidelización), no un secreto: igual que en LoyaltyPlugin,
 * se pasa con `InvoicingPlugin.init({...})` y no se lee aquí de las variables de
 * entorno. vendure-config.ts toma los valores de `process.env` (ver .env.example),
 * con lo que es configurable por entorno sin que este módulo tenga dos mecanismos.
 */
export function setInvoicingConfig(options: InvoicingPluginOptions): void {
    const placeholders = {
        storeName: !options.storeName,
        storeTaxId: !options.storeTaxId,
        storeAddress: !options.storeAddress,
    };
    cached = {
        storeName: options.storeName ?? 'Razón social pendiente de configurar',
        storeTaxId: options.storeTaxId ?? 'NIF/CIF PENDIENTE',
        storeAddress: options.storeAddress ?? 'Dirección fiscal pendiente de configurar',
        storeEmail: options.storeEmail ?? 'facturacion@example.com',
        storePhone: options.storePhone,
        storeRegistry: options.storeRegistry || undefined,
        fiscalRegistration: options.fiscalRegistration,
        pdfOutputDir: options.pdfOutputDir ?? path.join(__dirname, '../../../static/invoices'),
    };
    if (Object.values(placeholders).some(Boolean)) {
        Logger.warn(
            'InvoicingPlugin is using placeholder store fiscal data (name/tax ID/address). ' +
                'Set storeName/storeTaxId/storeAddress via InvoicingPlugin.init() before issuing real invoices.',
            loggerCtx,
        );
    }
}

export function getInvoicingConfig(): InvoicingConfig {
    if (!cached) {
        setInvoicingConfig({});
    }
    return cached!;
}
