import { NextRequest } from "next/server";

export function isCronRequest(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) return false;
  const header =
    request.headers.get("x-cron-secret") ||
    (() => {
      const auth = request.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) return auth.slice(7);
      return null;
    })();
  const querySecret = request.nextUrl.searchParams.get("secret");
  return (header !== null && header === envSecret) || querySecret === envSecret;
}
