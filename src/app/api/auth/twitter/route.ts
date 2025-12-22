import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect_to") || "/profile";

  // Используем переменную окружения для Ngrok или берем origin из запроса
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  const requestUrl = new URL(request.url);
  const origin = baseUrl || requestUrl.origin;

  const callbackUrl = `${origin}/api/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`;

  // Инициируем OAuth flow с Twitter через Supabase
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error) {
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
