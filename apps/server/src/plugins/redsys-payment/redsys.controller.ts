import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Logger } from '@vendure/core';

import { loggerCtx } from './constants';
import { RedsysService } from './redsys.service';
import type { RedsysNotificationBody } from './types';

/**
 * Recibe la notificación de pago de Redsys (de servidor a servidor).
 *
 * Responde siempre 200 para que Redsys no reintente sin fin una notificación que ya
 * hemos mirado (incluidas las rechazadas por inválidas): los reintentos solo sirven
 * para fallos pasajeros nuestros, no para una firma incorrecta o un pedido
 * desconocido, que nunca serán válidos al reintentar.
 *
 * Nota: a propósito NO usa el decorador `@Transaction()` de Vendure. Ese decorador
 * engancha su QueryRunner al RequestContext que el AuthGuard ya puso en la petición,
 * pero ese ctx no está autenticado (un webhook de Redsys no trae sesión de Vendure)
 * y RedsysService necesita un ctx de administrador de confianza. Como ese ctx se
 * crea desde cero, no tiene relación con lo que enganchó el interceptor, así que el
 * servicio gestiona su propia transacción con
 * `TransactionalConnection.withTransaction()`.
 */
@Controller('payments/redsys')
export class RedsysController {
    constructor(private redsysService: RedsysService) {}

    @Post('notify')
    @HttpCode(200)
    async notify(@Body() body: RedsysNotificationBody, @Req() req: Request): Promise<string> {
        try {
            const result = await this.redsysService.handleNotification(body, req);
            Logger.info(
                `Processed Redsys notification for order ${result.orderCode}${result.alreadyProcessed ? ' (duplicate, ignored)' : ''}`,
                loggerCtx,
            );
        } catch (err) {
            Logger.error(`Rejected Redsys notification: ${err instanceof Error ? err.message : String(err)}`, loggerCtx);
        }
        return 'OK';
    }
}
