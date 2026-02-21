import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  if (url.pathname === "/" && url.searchParams.has("code") && !url.searchParams.has("redirect_to")) {
    const callbackUrl = new URL("/api/auth/callback", url.origin);
    callbackUrl.searchParams.set("code", url.searchParams.get("code") || "");
    url.searchParams.forEach((value, key) => {
      if (key !== "code") {
        callbackUrl.searchParams.set(key, value);
      }
    });
    return NextResponse.redirect(callbackUrl);
  }

  if (url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

