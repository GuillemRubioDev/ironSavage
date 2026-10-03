import { NextFunction, Request, Response } from 'express';

import { RateLimiter } from './rate-limiter';
import { logSecurityEvent } from './security-events';

const limiter = new RateLimiter();

// Límite generoso: es una protección contra abuso de recursos, no el control de
// seguridad real (ese es la comprobación de la firma HMAC en
// RedsysService.handleNotification, que se ejecuta igualmente después). Inundar de
// POST de notificación desde una IP es barato para un atacante porque el endpoint
// siempre responde 200; esto solo impide que pueda repetirlo sin coste para siempre.
const LIMIT = 30;
const WINDOW_MS = 60_000;

export function redsysNotifyRateLimitMiddleware() {
    return function rateLimit(req: Request, res: Response, next: NextFunction): void {
        const ip = req.ip ?? 'unknown';
        const result = limiter.hit(`redsys-notify:ip:${ip}`, LIMIT, WINDOW_MS);
        if (!result.allowed) {
            logSecurityEvent('rate_limit_blocked', { rule: 'redsys-notify', ip });
            res.status(429).send('Too many requests');
            return;
        }
        next();
    };
}
