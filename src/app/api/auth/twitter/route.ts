import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect_to") || "/profile";

  // Всегда используем origin из запроса для правильного определения localhost
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  // Сохраняем redirect_to в cookie, чтобы восстановить его в callback
  const cookieStore = await cookies();
  cookieStore.set("oauth_redirect_to", redirectTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 минут
    path: "/",
  });

  // Используем фиксированный callback URL (как настроено в Supabase)
  const callbackUrl = `${origin}/api/auth/callback`;

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
