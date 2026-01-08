import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getAppOrigin } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Пытаемся получить redirect_to из cookie (сохраненный перед OAuth)
  const cookieStore = await cookies();
  const redirectToFromCookie = cookieStore.get("oauth_redirect_to")?.value;
  
  // Если есть в cookie, используем его, иначе из URL, иначе дефолт
  const redirectTo = redirectToFromCookie || searchParams.get("redirect_to") || "/profile";
  
  // Удаляем cookie после использования
  if (redirectToFromCookie) {
    cookieStore.delete("oauth_redirect_to");
  }

  // Автоматически определяем origin в зависимости от окружения
  const requestUrl = new URL(request.url);
  const origin = getAppOrigin(requestUrl.origin);

  if (code) {
    // Обмениваем код на сессию через Supabase
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    // Получаем данные пользователя
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Проверяем, существует ли профиль
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, country, country_code, city")
        .eq("id", user.id)
        .single();

      // Если профиля нет, проверяем откуда пришел запрос
      if (!profile && profileError?.code === "PGRST116") {
        // Профиль не существует
        // Если пользователь пришел с /login, редиректим на /signup с сообщением
        if (redirectTo === "/profile" || redirectTo.startsWith("/login")) {
          return NextResponse.redirect(
            `${origin}/signup?message=${encodeURIComponent("Please complete your registration. Your Twitter account is authorized, but your profile has not been created yet.")}`
          );
        }
        
        // Если пришел с /signup, создаем профиль и продолжаем процесс регистрации
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
          country: "Unknown",
          country_code: null,
          city: null,
          subscription_tier: "free",
          is_verified: isVerified,
        });

        if (insertError) {
          // Если не удалось создать профиль, все равно редиректим на signup
          return NextResponse.redirect(
            `${origin}/signup?message=${encodeURIComponent("Error creating profile. Please try again.")}`
          );
        }

        // Обрабатываем invite код, если он есть в redirect_to
        const redirectUrl = new URL(redirectTo, origin);
        const inviteCode = redirectUrl.searchParams.get("invite");
        
        if (inviteCode) {
          // Проверяем, что пользователь еще не использовал invite код
          const { data: existingReferral } = await supabase
            .from("referrals")
            .select("id")
            .eq("invited_user_id", user.id)
            .single();

          if (!existingReferral) {
            // Используем функцию БД для поиска invite (обходит RLS)
            const { data: inviteData } = await supabase
              .rpc('get_invite_by_code', { invite_code: inviteCode });

            const invite = inviteData && inviteData.length > 0 ? inviteData[0] : null;

            if (invite) {
              // Проверяем валидность инвайта
              const isNotExpired = !invite.expires_at || new Date(invite.expires_at) >= new Date();
              const isNotSelfInvite = invite.inviter_user_id !== user.id;
              
              // Проверяем количество использований только если max_uses задан
              let isWithinMaxUses = true;
              if (invite.max_uses !== null && invite.max_uses !== undefined) {
                const { count } = await supabase
                  .from("referrals")
                  .select("*", { count: "exact", head: true })
                  .eq("invite_id", invite.id);
                
                isWithinMaxUses = count !== null && count < invite.max_uses;
              }

              const isValid = isNotExpired && isWithinMaxUses && isNotSelfInvite;

              if (isValid) {
                // Создаем referral
                const { data: referral, error: referralError } = await supabase
                  .from("referrals")
                  .insert({
                    invite_id: invite.id,
                    inviter_user_id: invite.inviter_user_id,
                    invited_user_id: user.id,
                  })
                  .select()
                  .single();

                if (!referralError && referral) {
                  // Создаем взаимную дружбу через функцию БД (обходит RLS)
                  await supabase.rpc('create_mutual_friendship', {
                    p_user_id_1: invite.inviter_user_id,
                    p_user_id_2: user.id,
                  });
                }
              }
            }
          }
        }

        // Редиректим на signup для продолжения регистрации
        // Извлекаем redirect_to из исходного redirectTo (может быть /signup?redirect_to=...)
        const originalRedirectUrl = new URL(redirectTo, origin);
        const originalRedirectTo = originalRedirectUrl.searchParams.get("redirect_to");
        
        const signupUrl = new URL(`${origin}/signup`);
        signupUrl.searchParams.set("step", "location");
        signupUrl.searchParams.set("auth", "success");
        if (inviteCode) {
          signupUrl.searchParams.set("invite", inviteCode);
        }
        // Сохраняем redirect_to из исходного запроса
        if (originalRedirectTo) {
          signupUrl.searchParams.set("redirect_to", originalRedirectTo);
        }
        return NextResponse.redirect(signupUrl.toString());
      }

      // Если профиль существует, но неполный (нет country_code), тоже редиректим на signup
      if (profile && (!profile.country_code || profile.country === "Unknown")) {
        // Если пользователь пришел с /login, редиректим на /signup
        if (redirectTo === "/profile" || redirectTo.startsWith("/login")) {
          return NextResponse.redirect(
            `${origin}/signup?message=${encodeURIComponent("Please complete your registration. Fill in your location information.")}&step=location&auth=success`
          );
        }
      }

      // Если профиль существует и заполнен, обновляем его если нужно
      if (profile) {
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

      // Проверяем, нужно ли продолжить процесс регистрации
      if (redirectTo.startsWith("/signup")) {
        const redirectUrl = new URL(redirectTo, origin);
        const inviteCode = redirectUrl.searchParams.get("invite");
        
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("country, country_code, city")
          .eq("id", user.id)
          .single();

        // Извлекаем redirect_to из исходного redirectTo
        const originalRedirectTo = redirectUrl.searchParams.get("redirect_to");
        
        // Если локация не заполнена, редиректим на шаг location
        if (!currentProfile || !currentProfile.country_code || currentProfile.country === "Unknown") {
          const locationUrl = new URL(`${origin}/signup`);
          locationUrl.searchParams.set("step", "location");
          locationUrl.searchParams.set("auth", "success");
          if (inviteCode) {
            locationUrl.searchParams.set("invite", inviteCode);
          }
          // Сохраняем redirect_to из исходного запроса
          if (originalRedirectTo) {
            locationUrl.searchParams.set("redirect_to", originalRedirectTo);
          }
          return NextResponse.redirect(locationUrl.toString());
        }
        
        // Если профиль заполнен и есть вложенный redirect_to, редиректим на него
        if (originalRedirectTo) {
          const finalUrl = new URL(originalRedirectTo, origin);
          finalUrl.searchParams.set("auth", "success");
          return NextResponse.redirect(finalUrl.toString());
        }
        
        // Если профиль заполнен, но нет вложенного redirect_to, редиректим на шаг profile
        const profileUrl = new URL(`${origin}/signup`);
        profileUrl.searchParams.set("step", "profile");
        profileUrl.searchParams.set("auth", "success");
        if (inviteCode) {
          profileUrl.searchParams.set("invite", inviteCode);
        }
        return NextResponse.redirect(profileUrl.toString());
      }
    }

    // Редиректим на целевую страницу с параметром для обновления состояния
    const finalUrl = new URL(`${origin}${redirectTo}`);
    finalUrl.searchParams.set("auth", "success");
    return NextResponse.redirect(finalUrl.toString());
  }

  // Если нет кода, редиректим на логин с ошибкой
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
