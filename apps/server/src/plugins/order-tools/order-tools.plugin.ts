import { defaultOrderProcess, PluginCommonModule, VendurePlugin } from '@vendure/core';

import { OrderToolsController } from './order-tools.controller';
import { OrderToolsService } from './order-tools.service';
import { warehouseOrderProcess } from './warehouse-order-process';

/**
 * Pequeñas utilidades para preparar y despachar pedidos pagados, añadidas sobre las
 * funciones nativas de pedidos y envíos de Vendure (que ya permiten marcar artículos
 * como preparados/enviados y descargar facturas; ver el diálogo «Preparar pedido»
 * del dashboard y el plugin de facturación):
 *
 * - Una etiqueta de envío imprimible por pedido (`GET /order-tools/shipping-labels?orders=<id,id,...>`),
 *   desde un botón en la ficha del pedido y como acción masiva en la lista de
 *   pedidos (seleccionar varios pedidos pagados e imprimir todas sus etiquetas).
 * - Una hoja imprimible de «pedidos para preparar hoy» (`GET /order-tools/daily-orders?date=YYYY-MM-DD`),
 *   con los productos y cantidades, dirección y método de envío de cada pedido
 *   pagado, desde un botón en la lista de pedidos.
 * - Los pasos de almacén del proceso de pedido: «Preparando pedido»
 *   (InPreparation) y «Pedido preparado» (ReadyToShip), entre el pago y el envío;
 *   ver warehouse-order-process.ts.
 *
 * Sin entidades nuevas; solo para administradores (comprobado a mano; el comentario
 * de OrderToolsController explica por qué `@Allow()` no sirve en un controlador REST).
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [OrderToolsController],
    providers: [OrderToolsService],
    configuration: config => {
        const processes = config.orderOptions.process ?? [defaultOrderProcess];
        config.orderOptions.process = [...processes, warehouseOrderProcess];
        return config;
    },
    dashboard: './dashboard/index.tsx',
    compatibility: '^3.0.0',
})
export class OrderToolsPlugin {}
