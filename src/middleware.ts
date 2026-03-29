import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { hasBlockedQueryPattern } from "@/lib/security/request-guards";
import { checkRateLimit } from "@/lib/security/rate-limit";

/** Longest prefix first so more specific rules win if paths overlap. */
const RATE_LIMITED_API_PREFIXES: readonly string[] = [
  "/api/auth/twitter",
  "/api/communities",
  "/api/workspaces",
  "/api/projects",
  "/api/events",
  "/api/users",
  "/api/hubs",
].sort((a, b) => b.length - a.length);

function getApiRateLimitGroup(pathname: string): string | null {
  for (const prefix of RATE_LIMITED_API_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return prefix;
    }
  }
  return null;
}

const supabaseOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!raw) return null;
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

const isDevelopment = process.env.NODE_ENV === "development";

const staticScriptSources = [
  "'self'",
  isDevelopment ? "'unsafe-eval'" : "",
  "https://www.googletagmanager.com",
]
  .filter(Boolean)
  .join(" ");

const styleSources = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"].join(" ");
const fontSources = ["'self'", "data:", "https://fonts.gstatic.com"].join(" ");

const connectSources = [
  "'self'",
  supabaseOrigin,
  "https://api.twitter.com",
  "https://syndication.twitter.com",
  "https://basemaps.cartocdn.com",
  "https://*.cartocdn.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://region1.google-analytics.com",
]
  .filter(Boolean)
  .join(" ");

function buildCsp(nonce: string): string {
  const scriptSources = [
    staticScriptSources,
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources}`,
    `script-src-elem ${scriptSources}`,
    `style-src ${styleSources}`,
    `style-src-elem ${styleSources}`,
    "img-src 'self' data: blob: https:",
    `font-src ${fontSources}`,
    "worker-src 'self' blob:",
    `connect-src ${connectSources}`,
    "frame-src https://platform.twitter.com",
    process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

const HEADERS_TO_REMOVE = ["x-vercel-id", "x-vercel-deployment-url", "server"];

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  for (const h of HEADERS_TO_REMOVE) {
    response.headers.delete(h);
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
    if (!raw) continue;
    const candidate = raw.split(",")[0]?.trim();
    if (candidate) return candidate;
  }

  return "unknown";
}

function shouldRateLimitApiGet(request: NextRequest): string | null {
  if (request.method !== "GET") return null;
  return getApiRateLimitGroup(request.nextUrl.pathname);
}

function withRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  resetAt: number
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(resetAt / 1000)));
  return response;
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Generate a per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Forward nonce to server components via request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // ── OAuth callback shortcut ──────────────────────────────────────────────
  if (url.pathname === "/" && url.searchParams.has("code") && !url.searchParams.has("redirect_to")) {
    const callbackUrl = new URL("/api/auth/callback", url.origin);
    callbackUrl.searchParams.set("code", url.searchParams.get("code") || "");
    url.searchParams.forEach((value, key) => {
      if (key !== "code") callbackUrl.searchParams.set(key, value);
    });
    return applySecurityHeaders(NextResponse.redirect(callbackUrl), nonce);
  }

  // ── Block _next/data admin routes ────────────────────────────────────────
  if (url.pathname.startsWith("/_next/data/") && url.pathname.includes("/admin")) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
      nonce
    );
  }

  // ── API routes ───────────────────────────────────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    if (hasBlockedQueryPattern(url.search)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Blocked query pattern" }, { status: 400 }),
        nonce
      );
    }

    const rateLimitGroup = shouldRateLimitApiGet(request);
    if (rateLimitGroup) {
      const clientAddress = getClientAddress(request);
      const rateLimitKey = `${rateLimitGroup}:${clientAddress}`;
      const { limited, remaining, resetAt, limit } = await checkRateLimit(rateLimitKey);

      if (limited) {
        return applySecurityHeaders(
          withRateLimitHeaders(
            NextResponse.json(
              { error: "Too many requests. Try again later." },
              { status: 429 }
            ),
            remaining,
            limit,
            resetAt
          ),
          nonce
        );
      }

      return applySecurityHeaders(
        withRateLimitHeaders(NextResponse.next(), remaining, limit, resetAt),
        nonce
      );
    }

    return applySecurityHeaders(NextResponse.next(), nonce);
  }

  // ── All other routes — refresh Supabase session ──────────────────────────
  const supabaseResponse = await updateSession(
    new NextRequest(request.url, { headers: requestHeaders })
  );
  return applySecurityHeaders(supabaseResponse, nonce);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
