/**
 * Simple in-memory rate limit for QR scan/connect endpoints.
 * For production at scale, prefer Redis/Upstash or edge rate limiting.
 */

const windowMs = 60 * 1000; // 1 minute

interface WindowState {
  count: number;
  windowStart: number;
}

const scanStore = new Map<string, WindowState>();
const connectStore = new Map<string, WindowState>();

const SCAN_LIMIT = 30;
const CONNECT_LIMIT = 10;

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}

function checkLimit(store: Map<string, WindowState>, key: string, limit: number): boolean {
  const now = Date.now();
  const state = store.get(key);

  if (!state) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (now - state.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (state.count >= limit) {
    return false;
  }

  state.count += 1;
  return true;
}

export function checkScanRateLimit(request: Request): boolean {
  const key = `scan:${getClientKey(request)}`;
  return checkLimit(scanStore, key, SCAN_LIMIT);
}

export function checkConnectRateLimit(request: Request): boolean {
  const key = `connect:${getClientKey(request)}`;
  return checkLimit(connectStore, key, CONNECT_LIMIT);
}
