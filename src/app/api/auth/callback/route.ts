import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") || "/profile";

  if (code) {
    // Обмениваем код на сессию через Supabase
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    // Получаем данные пользователя
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Проверяем, существует ли профиль
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      // Если профиля нет, создаем его из Twitter данных
      if (!profile) {
        // Получаем Twitter identity
        const twitterIdentity = user.identities?.find(
          (identity: any) => identity.provider === "twitter"
        );
        const metadata = user.user_metadata;

        // Извлекаем данные из Twitter
        const twitterId = twitterIdentity?.id || metadata?.sub || metadata?.twitter_id || "";
        const twitterHandle = metadata?.preferred_username || metadata?.user_name || metadata?.twitter_handle || "";
        const twitterName = metadata?.full_name || metadata?.name || metadata?.twitter_name || "";
        const avatarUrl = metadata?.avatar_url || metadata?.picture || metadata?.profile_image_url || "";
        const isVerified = metadata?.verified || false;

        // Создаем профиль
        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          twitter_id: twitterId,
          twitter_handle: twitterHandle,
          twitter_name: twitterName,
          avatar_url: avatarUrl,
          country: "Unknown", // Можно попробовать получить из локации
          subscription_tier: "free",
          is_verified: isVerified,
        });

        if (insertError) {
          console.error("Error creating profile:", insertError);
          // Продолжаем редирект даже если не удалось создать профиль
        }
      } else {
        // Обновляем профиль если нужно (например, аватар или имя могли измениться)
        const metadata = user.user_metadata;
        const twitterIdentity = user.identities?.find(
          (identity: any) => identity.provider === "twitter"
        );

        const updates: any = {};
        if (metadata?.full_name || metadata?.name) {
          updates.twitter_name = metadata.full_name || metadata.name;
        }
        if (metadata?.avatar_url || metadata?.picture || metadata?.profile_image_url) {
          updates.avatar_url = metadata.avatar_url || metadata.picture || metadata.profile_image_url;
        }
        if (metadata?.verified !== undefined) {
          updates.is_verified = metadata.verified;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("profiles")
            .update(updates)
            .eq("id", user.id);
        }
      }
    }

    // Редиректим на целевую страницу
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Если нет кода, редиректим на логин с ошибкой
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
