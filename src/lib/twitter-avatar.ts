const TWITTER_IMAGE_HOSTS = new Set(["pbs.twimg.com", "abs.twimg.com"]);
const TWITTER_NAME_QUERY_SIZES = new Set(["small", "normal", "bigger", "mini", "thumb"]);

/**
 * Normalizes Twitter/X avatar URLs to a higher-quality variant.
 * - Converts legacy *_normal|*_bigger|*_mini filenames to "original" (no suffix).
 * - Converts `?name=small|normal|bigger|mini|thumb` to `?name=orig`.
 */
export function normalizeTwitterAvatarUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) {
    return "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (!TWITTER_IMAGE_HOSTS.has(host)) {
    return trimmed;
  }

  parsedUrl.pathname = parsedUrl.pathname
    .replace(/(_normal|_bigger|_mini)(\.[a-z0-9]+)$/i, "$2")
    .replace(/(_normal|_bigger|_mini)$/i, "");

  const nameParam = parsedUrl.searchParams.get("name");
  if (nameParam && TWITTER_NAME_QUERY_SIZES.has(nameParam.toLowerCase())) {
    parsedUrl.searchParams.set("name", "orig");
  }

  return parsedUrl.toString();
}
