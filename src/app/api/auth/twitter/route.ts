import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams, origin } = new URL(request.url);
  const redirectTo = searchParams.get("redirect_to") || "/profile";

  console.log("[TWITTER OAUTH] Starting OAuth flow:", {
    redirectTo,
    origin,
    callbackUrl: `${origin}/api/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
  });

  // Инициируем OAuth flow с Twitter через Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo: `${origin}/api/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    console.error("Twitter OAuth error:", error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // Supabase вернет URL для редиректа на Twitter
  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
