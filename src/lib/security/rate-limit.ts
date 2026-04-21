/**
 * Rate limiting via Upstash Redis.
 * Falls back to in-memory store if UPSTASH_REDIS_REST_URL / TOKEN are not set.
 *
 * Required env vars (production):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 120;

// ─── Upstash limiter (shared across all edge instances) ──────────────────────

let upstashLimiter: Ratelimit | null = null;

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const redis = new Redis({ url, token });
    upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_SECONDS} s`),
      prefix: "rl:api",
      analytics: false,
    });
    return upstashLimiter;
  } catch {
    return null;
  }
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
const MAX_BUCKETS = 8_000;

function pruneStore(now: number) {
  if (store.size < MAX_BUCKETS) return;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function checkInMemory(key: string): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  pruneStore(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const entry: Entry = { count: 1, resetAt: now + WINDOW_SECONDS * 1000 };
    store.set(key, entry);
    return { limited: false, remaining: MAX_REQUESTS - 1, resetAt: entry.resetAt };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { limited: true, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    limited: false,
    remaining: MAX_REQUESTS - existing.count,
    resetAt: existing.resetAt,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter();

  if (limiter) {
    try {
      const { success, remaining, reset } = await limiter.limit(identifier);
      return {
        limited: !success,
        remaining,
        resetAt: reset,
        limit: MAX_REQUESTS,
      };
    } catch (err) {
      console.warn("[rate-limit] Upstash unavailable, falling back to in-memory", err);
    }
  }

  // In-memory fallback (also used when Upstash is unreachable)
  const result = checkInMemory(identifier);
  return { ...result, limit: MAX_REQUESTS };
}
