import "server-only";

import {
  isValidIanaTimezone,
  normalizeCoordinates,
  resolveTimezoneWithSource,
} from "@/lib/luma/timezone";

export interface CoordinatesInput {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
}

export interface NormalizedCoordinates {
  latitude: number;
  longitude: number;
}

export function normalizeValidCoordinates(input: CoordinatesInput): NormalizedCoordinates | null {
  const normalized = normalizeCoordinates(input.latitude, input.longitude);
  if (normalized.lat == null || normalized.lng == null) {
    return null;
  }

  return {
    latitude: normalized.lat,
    longitude: normalized.lng,
  };
}

export function resolveTimezoneFromCoordinates(input: CoordinatesInput): string | null {
  const coordinates = normalizeValidCoordinates(input);
  if (!coordinates) {
    return null;
  }

  const resolution = resolveTimezoneWithSource({
    lat: coordinates.latitude,
    lng: coordinates.longitude,
  });

  if (!isValidIanaTimezone(resolution.timezone)) {
    return null;
  }

  return resolution.timezone;
}
