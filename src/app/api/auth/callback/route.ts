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
        .select("id, country, city")
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
        } else {
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
                    const { error: friendshipError } = await supabase
                      .rpc('create_mutual_friendship', {
                        p_user_id_1: invite.inviter_user_id,
                        p_user_id_2: user.id,
                      });

                    if (friendshipError) {
                      console.error("Error creating mutual friendship:", friendshipError);
                    }
                  } else {
                    console.error("Failed to create referral:", referralError);
                  }
                }
              }
            }
          }
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

      // Проверяем, нужно ли продолжить процесс регистрации
      // Если пользователь пришел с /signup и профиль не заполнен, редиректим на нужный шаг
      if (redirectTo.startsWith("/signup")) {
        const redirectUrl = new URL(redirectTo, origin);
        const inviteCode = redirectUrl.searchParams.get("invite");
        
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("country, city")
          .eq("id", user.id)
          .single();

        // Если локация не заполнена, редиректим на шаг location
        if (!currentProfile || !currentProfile.country || currentProfile.country === "Unknown") {
          const locationUrl = new URL(`${origin}/signup`);
          locationUrl.searchParams.set("step", "location");
          if (inviteCode) {
            locationUrl.searchParams.set("invite", inviteCode);
          }
          return NextResponse.redirect(locationUrl.toString());
        }
        // Если локация есть, но нет других данных профиля, редиректим на шаг profile
        // Для простоты, если есть локация, считаем что можно перейти к профилю
        const profileUrl = new URL(`${origin}/signup`);
        profileUrl.searchParams.set("step", "profile");
        if (inviteCode) {
          profileUrl.searchParams.set("invite", inviteCode);
        }
        return NextResponse.redirect(profileUrl.toString());
      }
    }

    // Редиректим на целевую страницу
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Если нет кода, редиректим на логин с ошибкой
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
