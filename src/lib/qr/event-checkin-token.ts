/**
 * Event check-in QR: rotating signed token (no static QR payload).
 * Used in the next phase for host check-in UI and attendee check-in flow.
 * Payload is HMAC-signed; validation checks signature, key version, and time window.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { getQrSigningSecret } from "./feature-flags";

export interface CheckinWindowPayload {
  qr_code_id: string;
  event_id: string;
  window_start: number; // Unix seconds
  window_end: number;   // Unix seconds
  signing_key_version: number;
}

const PAYLOAD_VERSION = 1;
const SEP = "|";

function getSecret(): string {
  const secret = getQrSigningSecret();
  if (!secret) {
    throw new Error("QR_SIGNING_SECRET is not set; required for event check-in tokens");
  }
  return secret;
}

function encodePayload(p: CheckinWindowPayload): string {
  return [p.qr_code_id, p.event_id, String(p.window_start), String(p.window_end), String(p.signing_key_version)].join(SEP);
}

function decodePayload(raw: string): CheckinWindowPayload | null {
  const parts = raw.split(SEP);
  if (parts.length !== 5) {
    return null;
  }
  const window_start = parseInt(parts[2], 10);
  const window_end = parseInt(parts[3], 10);
  const signing_key_version = parseInt(parts[4], 10);
  if (!Number.isFinite(window_start) || !Number.isFinite(window_end) || !Number.isFinite(signing_key_version)) {
    return null;
  }
  return {
    qr_code_id: parts[0],
    event_id: parts[1],
    window_start,
    window_end,
    signing_key_version,
  };
}

function sign(payloadString: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadString).digest("hex");
}

/**
 * Build a signed token for the current check-in window.
 * Caller should pass window_start/window_end (e.g. 30-minute windows).
 */
export function signCheckinWindowToken(payload: CheckinWindowPayload): string {
  const secret = getSecret();
  const payloadString = encodePayload(payload);
  const signature = sign(payloadString, secret);
  const encoded = Buffer.from(payloadString, "utf8").toString("base64url");
  return `${PAYLOAD_VERSION}.${encoded}.${signature}`;
}

export interface VerifyResult {
  ok: true;
  payload: CheckinWindowPayload;
}

export interface VerifyError {
  ok: false;
  reason: "missing_secret" | "invalid_format" | "invalid_signature" | "expired_window" | "invalid_payload";
}

/**
 * Verify a check-in token: signature, key version, and that current time is within window.
 * Returns payload on success, or { ok: false, reason } on failure.
 */
export function verifyCheckinWindowToken(
  token: string,
  options?: { nowSeconds?: number }
): VerifyResult | VerifyError {
  const secret = getQrSigningSecret();
  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "invalid_format" };
  }

  const [versionStr, encoded, signature] = parts;
  if (versionStr !== String(PAYLOAD_VERSION)) {
    return { ok: false, reason: "invalid_format" };
  }

  let payloadString: string;
  try {
    payloadString = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return { ok: false, reason: "invalid_format" };
  }

  const expectedSig = sign(payloadString, secret);
  if (expectedSig.length !== signature.length || !timingSafeEqual(Buffer.from(expectedSig, "hex"), Buffer.from(signature, "hex"))) {
    return { ok: false, reason: "invalid_signature" };
  }

  const payload = decodePayload(payloadString);
  if (!payload) {
    return { ok: false, reason: "invalid_payload" };
  }

  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (now < payload.window_start || now > payload.window_end) {
    return { ok: false, reason: "expired_window" };
  }

  return { ok: true, payload };
}
