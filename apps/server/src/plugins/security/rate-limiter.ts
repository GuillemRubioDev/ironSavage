/**
 * Minimal in-memory fixed-window rate limiter — no Redis/external store, since
 * this project runs a single Vendure server instance (see docker-compose.prod.yml).
 * If this is ever scaled horizontally, these counters stop being shared across
 * instances and this should move to a shared store instead.
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

    /** Records one hit for `key`; returns whether it's still within `limit` for the current window. */
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

    /** Drops expired buckets so memory doesn't grow unbounded; runs at most once a minute. */
    private maybeSweep(now: number): void {
        if (now - this.lastSweep < 60_000) return;
        this.lastSweep = now;
        for (const [key, bucket] of this.buckets) {
            if (bucket.resetAt <= now) this.buckets.delete(key);
        }
    }
}
