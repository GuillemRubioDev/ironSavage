import path from 'path';
import { Logger } from '@vendure/core';

import { loggerCtx } from './constants';
import type { InvoicingConfig, InvoicingPluginOptions } from './types';

let cached: InvoicingConfig | undefined;

/**
 * Store fiscal identity is business/legal configuration (like the loyalty
 * program's rules), not a secret — so like LoyaltyPlugin this is set via
 * `InvoicingPlugin.init({...})` rather than read directly from env vars here.
 * vendure-config.ts is expected to source the values it passes in from
 * `process.env` (see .env.example), which satisfies "configurable via
 * configuration/env" without this module needing two separate mechanisms.
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
