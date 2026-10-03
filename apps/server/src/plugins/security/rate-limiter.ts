/**
 * Limitador de peticiones mínimo en memoria con ventana fija, sin Redis ni almacén
 * externo, porque el proyecto usa una sola instancia del servidor Vendure (ver
 * docker-compose.prod.yml). Si algún día se escala horizontalmente, estos contadores
 * dejan de compartirse entre instancias y habría que pasar a un almacén compartido.
 */
interface Bucket {
    count: number;
    resetAt: number;
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfterMs?: number;
}

export class RateLimiter {
    private buckets = new Map<string, Bucket>();
    private lastSweep = Date.now();

    /** Anota un acceso para `key`; devuelve si sigue dentro de `limit` en la ventana actual. */
    hit(key: string, limit: number, windowMs: number): RateLimitResult {
        const now = Date.now();
        this.maybeSweep(now);

        const bucket = this.buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            this.buckets.set(key, { count: 1, resetAt: now + windowMs });
            return { allowed: true };
        }
        if (bucket.count >= limit) {
            return { allowed: false, retryAfterMs: bucket.resetAt - now };
        }
        bucket.count += 1;
        return { allowed: true };
    }

    /** Elimina los contadores caducados para que la memoria no crezca sin límite; se ejecuta como mucho una vez por minuto. */
    private maybeSweep(now: number): void {
        if (now - this.lastSweep < 60_000) return;
        this.lastSweep = now;
        for (const [key, bucket] of this.buckets) {
            if (bucket.resetAt <= now) this.buckets.delete(key);
        }
    }
}
