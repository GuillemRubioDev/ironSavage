import { NextFunction, Request, Response } from 'express';

import { RateLimiter } from './rate-limiter';
import { extractIdentifier, RATE_LIMIT_RULES } from './rate-limit-rules';
import { logSecurityEvent } from './security-events';

const limiter = new RateLimiter();

/**
 * Examina el cuerpo de un POST GraphQL para decidir si la mutación invocada coincide
 * con alguna de RATE_LIMIT_RULES. La Shop API y la Admin API pasan todas las
 * operaciones por un único endpoint, así que limitar por mutación exige mirar el
 * texto de la consulta y sus variables, no la ruta.
 */
export function graphqlRateLimitMiddleware() {
    return function rateLimit(req: Request, res: Response, next: NextFunction): void {
        const query = req.body?.query;
        if (req.method !== 'POST' || typeof query !== 'string') {
            next();
            return;
        }

        const rule = RATE_LIMIT_RULES.find(candidate => candidate.fieldPattern.test(query));
        if (!rule) {
            next();
            return;
        }

        const ip = req.ip ?? 'unknown';
        const identifier = extractIdentifier(req.body?.variables, rule.identifierVariables);

        const checks: Array<{ key: string } & { limit: number; windowMs: number }> = [
            { key: `${rule.name}:ip:${ip}`, ...rule.perIp },
        ];
        if (identifier && rule.perIdentifier) {
            checks.push({ key: `${rule.name}:id:${identifier}`, ...rule.perIdentifier });
        }
        if (identifier && rule.perIpAndIdentifier) {
            checks.push({ key: `${rule.name}:ipid:${ip}:${identifier}`, ...rule.perIpAndIdentifier });
        }

        for (const check of checks) {
            const result = limiter.hit(check.key, check.limit, check.windowMs);
            if (!result.allowed) {
                logSecurityEvent('rate_limit_blocked', { rule: rule.name, ip, hasIdentifier: !!identifier });
                res.status(429).json({
                    errors: [
                        {
                            message: 'Too many attempts. Please try again later.',
                            extensions: { code: 'RATE_LIMITED', retryAfterMs: result.retryAfterMs },
                        },
                    ],
                });
                return;
            }
        }

        if (rule.logOutcome) {
            const originalJson = res.json.bind(res);
            res.json = ((body: unknown) => {
                try {
                    const failed = graphqlResultLooksLikeFailure(body);
                    logSecurityEvent(failed ? 'auth_failed' : 'auth_succeeded', {
                        rule: rule.name,
                        ip,
                        identifier,
                    });
                } catch {
                    // El log nunca debe romper la respuesta real.
                }
                return originalJson(body);
            }) as Response['json'];
        }

        next();
    };
}

function graphqlResultLooksLikeFailure(body: unknown): boolean {
    if (!body || typeof body !== 'object') return true;
    const asRecord = body as { errors?: unknown; data?: Record<string, unknown> };
    if (Array.isArray(asRecord.errors) && asRecord.errors.length > 0) return true;
    const data = asRecord.data;
    if (!data) return true;
    const [firstValue] = Object.values(data);
    if (firstValue && typeof firstValue === 'object' && '__typename' in firstValue) {
        const typename = String((firstValue as { __typename: unknown }).__typename);
        return typename.endsWith('Error') || typename === 'NotVerifiedError';
    }
    return false;
}
