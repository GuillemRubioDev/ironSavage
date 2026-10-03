import { PluginCommonModule, VendurePlugin } from '@vendure/core';

import { adminApiExtensions, shopApiExtensions } from './api-extensions';
import { setInvoicingConfig } from './invoicing-config';
import { InvoicingAdminResolver } from './invoicing-admin.resolver';
import { InvoicingShopResolver } from './invoicing-shop.resolver';
import { InvoicingController } from './invoicing.controller';
import { InvoicingEventSubscriber } from './invoicing-event-subscriber';
import { InvoicingService } from './invoicing.service';
export { InvoiceGeneratedEvent } from './invoice-generated-event';
export { InvoiceResendRequestedEvent } from './invoice-resend-event';
import { Invoice } from './invoice.entity';
import { InvoiceLine } from './invoice-line.entity';
import { InvoiceSequence } from './invoice-sequence.entity';
import type { InvoicingPluginOptions } from './types';

/**
 * Facturación: cuando se cobra un pedido, genera una factura con numeración
 * correlativa (con copias congeladas del cliente, la dirección de facturación y las
 * líneas) y un PDF descargable. Cuando se liquida un reembolso, emite una factura
 * rectificativa (serie R, importes negativos, por diferencias). Totalmente
 * independiente: no modifica nada del núcleo de Vendure ni toca los plugins de
 * Redsys o fidelización.
 *
 * ## Alcance fiscal: léelo antes de facturar de verdad
 *
 * Implementado:
 * - Facturas ordinarias (serie A) y rectificativas (serie R) con numeración
 *   correlativa sin huecos.
 * - Punto de enganche para Veri*Factu (`fiscalRegistration`, ver
 *   FiscalRegistrationProvider en types.ts): la factura guarda la respuesta del
 *   proveedor y el PDF imprime su QR y leyenda.
 *
 * A propósito NO implementado (pendiente de una fase revisada por la gestoría):
 * - El envío real a la AEAT (Veri*Factu): falta elegir proveedor homologado y
 *   escribir el adaptador.
 * - El NIF del cliente: el Customer/Address de Vendure no lo tienen en este
 *   proyecto, así que las facturas se emiten sin él.
 * - Numeración por año, anulación de facturas y cualquier otro requisito español
 *   no listado arriba.
 *
 * **Quien active esto para ventas reales debe confirmar con la gestoría**: si la
 * numeración continua (no anual) es válida, si hace falta el NIF del cliente en
 * estas facturas y los requisitos de arriba antes de desarrollarlos.
 *
 * ## Configuración
 * ```ts
 * InvoicingPlugin.init({
 *   storeName: process.env.INVOICE_STORE_NAME,
 *   storeTaxId: process.env.INVOICE_STORE_TAX_ID,
 *   storeAddress: process.env.INVOICE_STORE_ADDRESS,
 *   storeEmail: process.env.INVOICE_STORE_EMAIL,
 *   storePhone: process.env.INVOICE_STORE_PHONE,
 * })
 * ```
 * Descarga del PDF: `GET /invoices/:id/pdf` (sesión de administrador, o el cliente
 * dueño del pedido con la sesión iniciada). La consulta `myInvoices` de la Shop API
 * lista las facturas del cliente para enlazar a esa ruta.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [InvoicingController],
    providers: [InvoicingService, InvoicingEventSubscriber],
    entities: [Invoice, InvoiceLine, InvoiceSequence],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [InvoicingAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [InvoicingShopResolver],
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class InvoicingPlugin {
    static options: InvoicingPluginOptions = {};

    static init(options: InvoicingPluginOptions): typeof InvoicingPlugin {
        InvoicingPlugin.options = options;
        setInvoicingConfig(options);
        return InvoicingPlugin;
    }
}
