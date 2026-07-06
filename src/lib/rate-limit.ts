/**
 * In-process fixed-window rate limiter — the burst brake in front of the
 * streaming AI routes.
 *
 * Deliberately per-instance: no Redis, no external store. On serverless each
 * instance counts independently, so this alone is not a hard guarantee — the
 * cross-instance daily quota (consume_ai_generation_quota) is the
 * authoritative spend cap. What this catches cheaply is the common abuse
 * shape: a tight client loop hammering one instance, stopped before it burns
 * through a day's quota in a minute.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

// Bound the map so a large key population (many users on a long-lived
// instance) cannot grow memory unboundedly; expired buckets are swept
// opportunistically when the map gets large.
const MAX_BUCKETS = 10_000;

export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [existingKey, existing] of buckets) {
        if (now - existing.windowStart >= windowMs) {
          buckets.delete(existingKey);
        }
      }
    }
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

// Shared policy for the streaming AI routes: generous for a human (nobody
// legitimately starts ten AI generations in a minute), tight for a loop.
export const STREAM_RATE_LIMIT = 10;
export const STREAM_RATE_WINDOW_MS = 60_000;

// Surfaced verbatim to the client on 429.
export const RATE_LIMIT_MESSAGE =
  "You're moving faster than we can generate — give it a few seconds and try again.";
