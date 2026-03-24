import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppOrigin } from "@/lib/utils";
import { normalizeOAuthRedirectTarget } from "@/lib/auth/oauth-redirect";
import { authDebugLog } from "@/lib/auth/debug";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const redirectTarget = normalizeOAuthRedirectTarget(
    searchParams.get("redirect_to")
  );
  const redirectTo = redirectTarget.value;

  // Автоматически определяем origin в зависимости от окружения
  const requestUrl = new URL(request.url);
  const origin = getAppOrigin(requestUrl.origin);

  authDebugLog("twitter", "oauth_start", {
    request_origin: requestUrl.origin,
    app_origin: origin,
    has_redirect_to_param: Boolean(searchParams.get("redirect_to")),
    redirect_target_type: redirectTarget.type,
    redirect_to: redirectTo,
  });

  // Сохраняем redirect_to в cookie, чтобы восстановить его в callback
  const cookieStore = await cookies();
  const oauthFlowNonce = crypto.randomUUID();
  cookieStore.set("oauth_redirect_to", redirectTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 минут
    path: "/",
  });
  cookieStore.set("oauth_flow_nonce", oauthFlowNonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
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
    authDebugLog("twitter", "oauth_init_failed", {
      message: error.message,
      callback_url: callbackUrl,
    });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  // Supabase вернет URL для редиректа на Twitter
  if (data?.url) {
    try {
      const providerUrl = new URL(data.url);
      const providerState = providerUrl.searchParams.get("state");
      if (providerState) {
        cookieStore.set("oauth_provider_state", providerState, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 600,
          path: "/",
        });
      }
    } catch {
      // Ignore provider URL parsing errors and fallback to nonce-only validation.
    }

    authDebugLog("twitter", "oauth_redirect_to_provider", {
      callback_url: callbackUrl,
      has_provider_url: true,
    });
    return NextResponse.redirect(data.url);
  }

  authDebugLog("twitter", "oauth_failed_no_provider_url", {
    callback_url: callbackUrl,
  });
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
