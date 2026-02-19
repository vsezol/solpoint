import tzLookup from "tz-lookup";

export function isValidIanaTimezone(value) {
  if (!value || typeof value !== "string") return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeCoordinates(latitude, longitude) {
  const lat =
    latitude == null || latitude === "" ? null : Number(latitude);
  const lng =
    longitude == null || longitude === "" ? null : Number(longitude);

  if (lat == null || lng == null) {
    return { lat: null, lng: null, wasZeroZero: false };
  }

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { lat: null, lng: null, wasZeroZero: false };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { lat: null, lng: null, wasZeroZero: false };
  }

  if (lat === 0 && lng === 0) {
    return { lat: null, lng: null, wasZeroZero: true };
  }

  return { lat, lng, wasZeroZero: false };
}

export function parseGmtOffset(rawDateTimeDisplay) {
  if (!rawDateTimeDisplay || typeof rawDateTimeDisplay !== "string") return null;

  const match = rawDateTimeDisplay.match(
    /(GMT|UTC)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i
  );

  if (!match) return null;

  const sign = match[2] === "+" ? 1 : -1;
  const hours = Number.parseInt(match[3], 10);
  const minutes = match[4] ? Number.parseInt(match[4], 10) : 0;

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours > 14) return null;
  if (minutes !== 0) return null;

  return sign * hours;
}

export function offsetToEtcGmt(offset) {
  if (!Number.isFinite(offset)) return null;
  if (offset < -14 || offset > 14) return null;
  if (offset === 0) return "Etc/GMT";

  // Etc/GMT has inverted sign semantics: GMT+3 => Etc/GMT-3
  const sign = offset > 0 ? "-" : "+";
  return `Etc/GMT${sign}${Math.abs(offset)}`;
}

export function resolveTimezoneWithSource({
  lat,
  lng,
  rawDateTimeDisplay,
}) {
  if (lat != null && lng != null) {
    try {
      const timezoneByCoords = tzLookup(lat, lng);
      if (isValidIanaTimezone(timezoneByCoords)) {
        return {
          timezone: timezoneByCoords,
          source: "coords",
          offset: null,
        };
      }
    } catch {
      // no-op, continue with fallback
    }
  }

  const parsedOffset = parseGmtOffset(rawDateTimeDisplay);
  if (parsedOffset != null) {
    const timezoneByOffset = offsetToEtcGmt(parsedOffset);
    if (timezoneByOffset && isValidIanaTimezone(timezoneByOffset)) {
      return {
        timezone: timezoneByOffset,
        source: "gmt_offset",
        offset: parsedOffset,
      };
    }
  }

  return {
    timezone: null,
    source: "none",
    offset: null,
  };
}

export function resolveTimezone(input) {
  return resolveTimezoneWithSource(input).timezone;
}
