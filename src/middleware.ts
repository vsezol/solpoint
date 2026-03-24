import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { hasBlockedQueryPattern } from "@/lib/security/request-guards";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const API_RATE_LIMIT_WINDOW_MS = 60_000;
const API_RATE_LIMIT_MAX_REQUESTS = 120;
const MAX_RATE_LIMIT_BUCKETS = 8_000;
const RATE_LIMITED_API_PATHS = new Set<string>([
  "/api/users",
  "/api/users/list",
  "/api/events",
  "/api/hubs",
  "/api/communities",
  "/api/projects",
  "/api/workspaces",
  "/api/auth/twitter",
]);

const rateLimitStore = new Map<string, RateLimitEntry>();

const supabaseOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!raw) return null;
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

const cspHeaderValue = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  }`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""} https://api.twitter.com https://syndication.twitter.com`,
  "frame-src https://platform.twitter.com",
  process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Content-Security-Policy", cspHeaderValue);
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return response;
}

function getClientAddress(request: NextRequest): string {
  const headerNames = [
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "x-real-ip",
    "x-forwarded-for",
  ];

  for (const headerName of headerNames) {
    const raw = request.headers.get(headerName);
    if (!raw) {
      continue;
    }

    const candidate = raw.split(",")[0]?.trim();
    if (candidate) {
      return candidate;
    }
  }

  return "unknown";
}

function shouldRateLimitApiRequest(request: NextRequest): boolean {
  if (request.method !== "GET") {
    return false;
  }

  return RATE_LIMITED_API_PATHS.has(request.nextUrl.pathname);
}

function pruneRateLimitStore(now: number) {
  if (rateLimitStore.size < MAX_RATE_LIMIT_BUCKETS) {
    return;
  }

  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function checkRateLimit(
  request: NextRequest
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  pruneRateLimitStore(now);

  const clientAddress = getClientAddress(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const key = `${request.nextUrl.pathname}:${clientAddress}:${userAgent.slice(
    0,
    64
  )}`;

  const existing = rateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    const next: RateLimitEntry = {
      count: 1,
      resetAt: now + API_RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(key, next);
    return {
      limited: false,
      remaining: Math.max(0, API_RATE_LIMIT_MAX_REQUESTS - next.count),
      resetAt: next.resetAt,
    };
  }

  if (existing.count >= API_RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    limited: false,
    remaining: Math.max(0, API_RATE_LIMIT_MAX_REQUESTS - existing.count),
    resetAt: existing.resetAt,
  };
}

function withRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(API_RATE_LIMIT_MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(resetAt / 1000)));
  return response;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  if (url.pathname === "/" && url.searchParams.has("code") && !url.searchParams.has("redirect_to")) {
    const callbackUrl = new URL("/api/auth/callback", url.origin);
    callbackUrl.searchParams.set("code", url.searchParams.get("code") || "");
    url.searchParams.forEach((value, key) => {
      if (key !== "code") {
        callbackUrl.searchParams.set(key, value);
      }
    });
    return applySecurityHeaders(NextResponse.redirect(callbackUrl));
  }

  if (url.pathname.startsWith("/_next/data/") && url.pathname.includes("/admin")) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 })
    );
  }

  if (url.pathname.startsWith("/api/")) {
    if (hasBlockedQueryPattern(url.search)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Blocked query pattern" },
          { status: 400 }
        )
      );
    }

    if (shouldRateLimitApiRequest(request)) {
      const { limited, remaining, resetAt } = checkRateLimit(request);
      if (limited) {
        return applySecurityHeaders(
          withRateLimitHeaders(
            NextResponse.json(
              { error: "Too many requests. Try again later." },
              { status: 429 }
            ),
            remaining,
            resetAt
          )
        );
      }

      return applySecurityHeaders(
        withRateLimitHeaders(NextResponse.next(), remaining, resetAt)
      );
    }

    return applySecurityHeaders(NextResponse.next());
  }

  return applySecurityHeaders(await updateSession(request));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
