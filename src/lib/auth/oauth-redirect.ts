const DEFAULT_WEB_REDIRECT = "/profile";

export type OAuthRedirectTarget =
  | { type: "web"; value: string }
  | { type: "mobile"; value: string };

function getAllowedMobileSchemes(): Set<string> {
  const raw = process.env.MOBILE_DEEP_LINK_SCHEMES || "solpointmobile";
  const schemes = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (schemes.length === 0) {
    return new Set(["solpointmobile"]);
  }

  return new Set(schemes);
}

function normalizeWebRedirect(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const normalized = new URL(value, "http://localhost");
    if (normalized.origin !== "http://localhost") {
      return null;
    }
    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  } catch {
    return null;
  }
}

function normalizeMobileRedirect(value: string): string | null {
  try {
    const parsed = new URL(value);
    const scheme = parsed.protocol.replace(":", "").toLowerCase();
    if (!getAllowedMobileSchemes().has(scheme)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeOAuthRedirectTarget(
  rawValue: string | null | undefined
): OAuthRedirectTarget {
  if (!rawValue) {
    return { type: "web", value: DEFAULT_WEB_REDIRECT };
  }

  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return { type: "web", value: DEFAULT_WEB_REDIRECT };
  }

  const webRedirect = normalizeWebRedirect(trimmedValue);
  if (webRedirect) {
    return { type: "web", value: webRedirect };
  }

  const mobileRedirect = normalizeMobileRedirect(trimmedValue);
  if (mobileRedirect) {
    return { type: "mobile", value: mobileRedirect };
  }

  return { type: "web", value: DEFAULT_WEB_REDIRECT };
}

function toRedirectUrl(target: OAuthRedirectTarget, origin: string): URL {
  if (target.type === "mobile") {
    return new URL(target.value);
  }

  return new URL(target.value, origin);
}

export function buildOAuthSuccessRedirect(
  target: OAuthRedirectTarget,
  origin: string,
  params: Record<string, string> = {}
): string {
  const redirectUrl = toRedirectUrl(target, origin);
  redirectUrl.searchParams.set("auth", "success");

  for (const [key, value] of Object.entries(params)) {
    redirectUrl.searchParams.set(key, value);
  }

  return redirectUrl.toString();
}

export function buildOAuthErrorRedirect(
  target: OAuthRedirectTarget,
  origin: string,
  error: string
): string {
  const redirectUrl = toRedirectUrl(target, origin);
  redirectUrl.searchParams.set("auth", "error");
  redirectUrl.searchParams.set("error", error);
  return redirectUrl.toString();
}
