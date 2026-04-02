import { createHash, randomBytes } from "node:crypto";

export const MOBILE_OAUTH_CODE_TTL_SECONDS = 120;

const MOBILE_OAUTH_CODE_REGEX = /^[A-Za-z0-9_-]{20,200}$/;

export function generateMobileOAuthCode(): string {
  return randomBytes(32).toString("base64url");
}

export function hashMobileOAuthCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function getMobileOAuthHandoffExpiresAt(): string {
  return new Date(Date.now() + MOBILE_OAUTH_CODE_TTL_SECONDS * 1000).toISOString();
}

export function isValidMobileOAuthCodeFormat(code: string): boolean {
  return MOBILE_OAUTH_CODE_REGEX.test(code);
}

export function getAccessTokenExpiresInSeconds(accessToken: string): number {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) {
      return 3600;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { exp?: number };

    if (typeof payload.exp !== "number") {
      return 3600;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(payload.exp - now, 0);
  } catch {
    return 3600;
  }
}
