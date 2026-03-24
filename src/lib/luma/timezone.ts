import {
  isValidIanaTimezone as runtimeIsValidIanaTimezone,
  normalizeCoordinates as runtimeNormalizeCoordinates,
  parseGmtOffset as runtimeParseGmtOffset,
  offsetToEtcGmt as runtimeOffsetToEtcGmt,
  resolveTimezoneWithSource as runtimeResolveTimezoneWithSource,
  resolveTimezone as runtimeResolveTimezone,
} from "./timezone-runtime.mjs";

export type TimezoneResolutionSource = "coords" | "gmt_offset" | "none";

export interface NormalizedCoordinates {
  lat: number | null;
  lng: number | null;
  wasZeroZero: boolean;
}

export interface ResolveTimezoneInput {
  lat: number | null;
  lng: number | null;
  rawDateTimeDisplay?: string | null;
}

export interface TimezoneResolutionResult {
  timezone: string | null;
  source: TimezoneResolutionSource;
  offset: number | null;
}

export function isValidIanaTimezone(value: string | null | undefined): boolean {
  return Boolean(runtimeIsValidIanaTimezone(value));
}

export function normalizeCoordinates(
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined
): NormalizedCoordinates {
  return runtimeNormalizeCoordinates(latitude, longitude) as NormalizedCoordinates;
}

export function parseGmtOffset(rawDateTimeDisplay: string | null | undefined): number | null {
  const value = runtimeParseGmtOffset(rawDateTimeDisplay);
  return typeof value === "number" ? value : null;
}

export function offsetToEtcGmt(offset: number): string | null {
  const value = runtimeOffsetToEtcGmt(offset);
  return typeof value === "string" ? value : null;
}

export function resolveTimezoneWithSource(
  input: ResolveTimezoneInput
): TimezoneResolutionResult {
  return runtimeResolveTimezoneWithSource({
    lat: input.lat,
    lng: input.lng,
    rawDateTimeDisplay: input.rawDateTimeDisplay ?? null,
  }) as TimezoneResolutionResult;
}

export function resolveTimezone(input: ResolveTimezoneInput): string | null {
  const value = runtimeResolveTimezone({
    lat: input.lat,
    lng: input.lng,
    rawDateTimeDisplay: input.rawDateTimeDisplay ?? null,
  });
  return typeof value === "string" ? value : null;
}
