import { NextFunction, Request, Response } from 'express';

import { RateLimiter } from './rate-limiter';
import { logSecurityEvent } from './security-events';

const limiter = new RateLimiter();

// Generous cap — this is a resource-abuse guard, not the real security
// control (that's the HMAC signature check in RedsysService.handleNotification,
// which still runs afterwards regardless of this limit). A genuine flood of
// notification POSTs from one IP is cheap for an attacker since the endpoint
// always answers 200; this just stops it from being free to repeat forever.
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
