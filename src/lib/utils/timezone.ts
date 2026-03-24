const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Warsaw",
  "Europe/Kyiv",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Jakarta",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland",
] as const;

export function isValidIanaTimezone(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function timezoneFromLongitude(longitude: number | null | undefined): string | null {
  if (longitude == null || Number.isNaN(longitude)) return null;
  const clamped = Math.max(-180, Math.min(180, longitude));
  const offset = Math.round(clamped / 15);
  if (offset === 0) return "Etc/GMT";
  const sign = offset > 0 ? "-" : "+";
  return `Etc/GMT${sign}${Math.abs(offset)}`;
}

export function resolveMeetingTimezone(params: {
  eventTimezone?: string | null;
  eventLongitude?: number | null;
}): string | null {
  if (isValidIanaTimezone(params.eventTimezone)) {
    return params.eventTimezone!;
  }

  const fallbackByLongitude = timezoneFromLongitude(params.eventLongitude);
  if (isValidIanaTimezone(fallbackByLongitude)) {
    return fallbackByLongitude;
  }

  return null;
}

export function getIanaTimezones(): string[] {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
    .supportedValuesOf;

  if (typeof supportedValuesOf === "function") {
    const zones = supportedValuesOf("timeZone");
    if (zones.length > 0) return zones;
  }

  return [...FALLBACK_TIMEZONES];
}

/**
 * Format meeting proposal time as "21:15 GMT+5" (time in given timezone + short offset).
 */
export function formatMeetingTimeGmt(startAt: string, timezone: string): string {
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return startAt;
  const tz = isValidIanaTimezone(timezone) ? timezone : "UTC";
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  const tzParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  }).formatToParts(d);
  const tzName = tzParts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  return `${timeStr} ${tzName}`;
}
