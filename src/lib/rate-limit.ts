type RateLimiterOptions = {
  max: number;
  windowMs: number;
  clock?: () => number;
};

type CheckResult = { allowed: true } | { allowed: false; retryAfterMs: number };

// In-memory sliding-window rate limiter. Single-process only — rotate to Redis
// or a DB-backed counter if/when OrderLink runs on more than one Node worker.
export function createRateLimiter(opts: RateLimiterOptions) {
  const { max, windowMs } = opts;
  const clock = opts.clock ?? (() => Date.now());
  const hits = new Map<string, number[]>();

  return {
    check(key: string): CheckResult {
      const now = clock();
      const cutoff = now - windowMs;
      const arr = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (arr.length >= max) {
        const oldest = arr[0];
        hits.set(key, arr);
        return { allowed: false, retryAfterMs: oldest + windowMs - now };
      }

      arr.push(now);
      hits.set(key, arr);
      return { allowed: true };
    },
  };
}

// Shared limiters for the OTP flow (per-mobile + per-IP).
// Module-level so counters survive across requests within the same Node process.
export const otpSendByMobile = createRateLimiter({ max: 3, windowMs: 15 * 60_000 });
export const otpSendByIp = createRateLimiter({ max: 10, windowMs: 15 * 60_000 });
export const otpVerifyByMobile = createRateLimiter({ max: 5, windowMs: 10 * 60_000 });

// Track page — 5 lookups per IP per hour. Deters brute-force enumeration of
// the (order#, last-4-mobile) tuple.
export const trackByIp = createRateLimiter({ max: 5, windowMs: 60 * 60_000 });
