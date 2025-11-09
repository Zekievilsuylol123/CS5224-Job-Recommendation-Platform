const buckets = new Map();
export function createRateLimiter(options) {
    const { capacity, refillIntervalMs } = options;
    return (req, res, next) => {
        const key = req.ip ?? req.headers['x-forwarded-for']?.toString() ?? 'unknown';
        const now = Date.now();
        const bucket = buckets.get(key) ?? { tokens: capacity, lastRefill: now };
        if (now - bucket.lastRefill >= refillIntervalMs) {
            bucket.tokens = capacity;
            bucket.lastRefill = now;
        }
        if (bucket.tokens <= 0) {
            res.status(429).json({
                error: 'rate_limit',
                message: 'Too many resume analyses. Try again later.'
            });
            return;
        }
        bucket.tokens -= 1;
        buckets.set(key, bucket);
        next();
    };
}
