import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Logger } from '@vendure/core';

import { loggerCtx } from './constants';
import { RedsysService } from './redsys.service';
import type { RedsysNotificationBody } from './types';

/**
 * Receives Redsys' server-to-server payment notification.
 *
 * Always responds 200 so Redsys doesn't endlessly retry a notification we've
 * already looked at (including ones we rejected as invalid) — retries are
 * only useful for transient failures on our side, not for a bad signature or
 * an unknown order, which will never become valid on retry.
 *
 * Note: this deliberately does NOT use Vendure's `@Transaction()` decorator.
 * That decorator attaches its QueryRunner to whatever RequestContext the
 * built-in AuthGuard already put on the request — but that ctx is an
 * unauthenticated one (there's no Vendure session on an incoming Redsys
 * webhook), and RedsysService needs a trusted admin-level ctx instead. Since
 * that admin ctx is constructed fresh, it has no connection to whatever the
 * interceptor attached, so the service manages its own transaction directly
 * via `TransactionalConnection.withTransaction()`.
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
