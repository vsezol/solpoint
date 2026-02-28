/**
 * QR module feature flags and env.
 * - PROFILE_QR_ENABLED: enable profile QR flow (default: true)
 * - EVENT_CHECKIN_QR_ENABLED: enable event check-in QR (default: false, for future phase)
 * - QR_SIGNING_SECRET: secret for signing event check-in window tokens (required for event phase)
 */

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

export function isProfileQrEnabled(): boolean {
  return parseBool(process.env.PROFILE_QR_ENABLED, true);
}

export function isEventCheckinQrEnabled(): boolean {
  return parseBool(process.env.EVENT_CHECKIN_QR_ENABLED, false);
}

export function getQrSigningSecret(): string | null {
  const raw = process.env.QR_SIGNING_SECRET;
  return raw && raw.length > 0 ? raw : null;
}
