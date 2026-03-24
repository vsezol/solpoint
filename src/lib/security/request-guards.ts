const BLOCKED_QUERY_PATTERNS: RegExp[] = [
  /(?:^|[?&])(or|and|not|select)=/i,
  /is\.null/i,
  /not\.is\.null/i,
  /\bin\.\(/i,
  /->>|->/i,
];

const DISALLOWED_SEARCH_CHARS_REGEX = /[,%()<>`"'\\]/g;

export function hasBlockedQueryPattern(search: string): boolean {
  if (!search) {
    return false;
  }

  return BLOCKED_QUERY_PATTERNS.some((pattern) => pattern.test(search));
}

export function sanitizeSearchTerm(
  value: string | null,
  maxLength: number = 80
): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .replace(DISALLOWED_SEARCH_CHARS_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

export function parseBoundedInt(
  value: string | null,
  defaultValue: number,
  minValue: number,
  maxValue: number
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, minValue), maxValue);
}
