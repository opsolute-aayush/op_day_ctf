// In-memory sliding-window rate limiter. Good enough for a single-process
// internal event deployment (see README "Scaling notes" for multi-instance caveats).

interface Bucket {
  attempts: number[]; // timestamps (ms) of recent attempts
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { attempts: [] };
  bucket.attempts = bucket.attempts.filter((t) => now - t < windowMs);

  if (bucket.attempts.length >= maxAttempts) {
    const oldest = bucket.attempts[0];
    buckets.set(key, bucket);
    return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
  }

  bucket.attempts.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterMs: 0 };
}
