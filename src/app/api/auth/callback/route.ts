import {
  buildOAuthErrorRedirect,
  buildOAuthSuccessRedirect,
  normalizeOAuthRedirectTarget,
  type OAuthRedirectTarget,
} from "@/lib/auth/oauth-redirect";
import {
  generateMobileOAuthCode,
  getMobileOAuthHandoffExpiresAt,
  hashMobileOAuthCode,
} from "@/lib/auth/mobile-oauth-handoff";
import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { authDebugLog } from "@/lib/auth/debug";
import { getAppOrigin } from "@/lib/utils";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function getRedirectUrl(target: OAuthRedirectTarget, origin: string): URL {
  if (target.type === "mobile") {
    return new URL(target.value);
  }
  return new URL(target.value, origin);
}

function getSafeNestedRedirect(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  const nestedTarget = normalizeOAuthRedirectTarget(rawValue);
  if (nestedTarget.type !== "web") {
    return null;
  }

  return nestedTarget.value;
}

async function applyInviteIfPresent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  inviteCode: string | null
) {
  if (!inviteCode) {
    return;
  }

  const { data: existingReferral } = await supabase
    .from("referrals")
    .select("id")
    .eq("invited_user_id", userId)
    .single();

  if (existingReferral) {
    return;
  }

  const { data: inviteData } = await supabase.rpc("get_invite_by_code", {
    invite_code: inviteCode,
  });

  const invite = inviteData && inviteData.length > 0 ? inviteData[0] : null;
  if (!invite) {
    return;
  }

  const isNotExpired =
    !invite.expires_at || new Date(invite.expires_at) >= new Date();
  const isNotSelfInvite = invite.inviter_user_id !== userId;

  let isWithinMaxUses = true;
  if (invite.max_uses !== null && invite.max_uses !== undefined) {
    const { count } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("invite_id", invite.id);

    isWithinMaxUses = count !== null && count < invite.max_uses;
  }

  if (!isNotExpired || !isNotSelfInvite || !isWithinMaxUses) {
    return;
  }

  const { data: referral, error: referralError } = await supabase
    .from("referrals")
    .insert({
      invite_id: invite.id,
      inviter_user_id: invite.inviter_user_id,
      invited_user_id: userId,
    })
    .select()
    .single();

  if (!referralError && referral) {
    await supabase.rpc("create_mutual_friendship", {
      p_user_id_1: invite.inviter_user_id,
      p_user_id_2: userId,
    });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const redirectToFromCookie = cookieStore.get("oauth_redirect_to")?.value;
  const redirectTarget = normalizeOAuthRedirectTarget(
    redirectToFromCookie || searchParams.get("redirect_to")
  );

  if (redirectToFromCookie) {
    cookieStore.delete("oauth_redirect_to");
  }

  const requestUrl = new URL(request.url);
  const origin = getAppOrigin(requestUrl.origin);
  const isMobileRedirect = redirectTarget.type === "mobile";
  const redirectUrl = getRedirectUrl(redirectTarget, origin);
  const inviteCode = redirectUrl.searchParams.get("invite");
  const nestedRedirectTo = getSafeNestedRedirect(
    redirectUrl.searchParams.get("redirect_to")
  );

  authDebugLog("callback", "callback_received", {
    request_origin: requestUrl.origin,
    app_origin: origin,
    has_code: Boolean(code),
    redirect_target_type: redirectTarget.type,
    redirect_target_value: redirectTarget.value,
    had_redirect_cookie: Boolean(redirectToFromCookie),
    has_invite_code: Boolean(inviteCode),
    has_nested_redirect_to: Boolean(nestedRedirectTo),
  });

  const redirectWithError = (errorMessage: string) => {
    authDebugLog("callback", "redirect_with_error", {
      is_mobile_redirect: isMobileRedirect,
      redirect_target: redirectTarget.value,
      error_message: errorMessage,
    });

    if (isMobileRedirect) {
      return NextResponse.redirect(
        buildOAuthErrorRedirect(redirectTarget, origin, errorMessage)
      );
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorMessage)}`
    );
  };

  if (!code) {
    return redirectWithError("no_code");
  }

  const { data: exchangeData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return redirectWithError(exchangeError.message);
  }

  authDebugLog("callback", "exchange_code_for_session_success", {
    has_session: Boolean(exchangeData.session),
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithError("oauth_failed");
  }

  authDebugLog("callback", "auth_user_loaded", {
    user_id: user.id,
    identities_count: user.identities?.length ?? 0,
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, country, country_code, city")
    .eq("id", user.id)
    .single();

  const profileMissing = !profile && profileError?.code === "PGRST116";
  const isSignupFlow =
    redirectTarget.type === "web" && redirectTarget.value.startsWith("/signup");
  const shouldCreateProfile =
    profileMissing &&
    (isMobileRedirect ||
      isSignupFlow ||
      (redirectTarget.type === "web" &&
        redirectTarget.value !== "/profile" &&
        !redirectTarget.value.startsWith("/login")));
  let createdProfileInThisCallback = false;

  authDebugLog("callback", "profile_lookup_result", {
    user_id: user.id,
    profile_found: Boolean(profile),
    profile_error_code: profileError?.code ?? null,
    profile_missing: profileMissing,
    is_signup_flow: isSignupFlow,
    should_create_profile: shouldCreateProfile,
    is_mobile_redirect: isMobileRedirect,
  });

  if (profileMissing && !shouldCreateProfile) {
    authDebugLog("callback", "profile_missing_without_creation_branch", {
      user_id: user.id,
      redirect_target: redirectTarget.value,
    });
    return NextResponse.redirect(
      `${origin}/signup?message=${encodeURIComponent(
        "Please complete your registration. Your Twitter account is authorized, but your profile has not been created yet."
      )}`
    );
  }

  if (shouldCreateProfile) {
    const twitterIdentity = user.identities?.find(
      (identity: { provider?: string; id?: string }) =>
        identity.provider === "twitter"
    );
    const metadata = user.user_metadata;

    const twitterId =
      twitterIdentity?.id || metadata?.sub || metadata?.twitter_id || "";
    const twitterHandle =
      metadata?.preferred_username || metadata?.user_name || metadata?.twitter_handle || "";
    const twitterName =
      metadata?.full_name || metadata?.name || metadata?.twitter_name || "";
    const avatarUrl =
      metadata?.avatar_url || metadata?.picture || metadata?.profile_image_url || "";
    const isVerified = metadata?.verified || false;

    authDebugLog("callback", "creating_profile", {
      user_id: user.id,
      twitter_id_length: twitterId.length,
      twitter_handle: twitterHandle || null,
      twitter_name: twitterName || null,
      has_avatar_url: Boolean(avatarUrl),
      is_verified: Boolean(isVerified),
      is_mobile_redirect: isMobileRedirect,
      redirect_target: redirectTarget.value,
    });

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
      authDebugLog("callback", "profile_create_failed", {
        user_id: user.id,
        message: insertError.message,
        code: insertError.code,
      });
      if (isMobileRedirect) {
        return redirectWithError("profile_create_failed");
      }

      return NextResponse.redirect(
        `${origin}/signup?message=${encodeURIComponent(
          "Error creating profile. Please try again."
        )}`
      );
    }

    createdProfileInThisCallback = true;
    authDebugLog("callback", "profile_created", {
      user_id: user.id,
      has_invite_code: Boolean(inviteCode),
    });
    await applyInviteIfPresent(supabase, user.id, inviteCode);
  }

  if (profile) {
    const metadata = user.user_metadata;
    const updates: Record<string, unknown> = {};

    if (metadata?.full_name || metadata?.name) {
      updates.twitter_name = metadata.full_name || metadata.name;
    }
    if (metadata?.avatar_url || metadata?.picture || metadata?.profile_image_url) {
      updates.avatar_url =
        metadata.avatar_url || metadata.picture || metadata.profile_image_url;
    }
    if (metadata?.verified !== undefined) {
      updates.is_verified = metadata.verified;
    }

    if (Object.keys(updates).length > 0) {
      authDebugLog("callback", "profile_update_from_metadata", {
        user_id: user.id,
        update_keys: Object.keys(updates),
      });
      await supabase.from("profiles").update(updates).eq("id", user.id);
    }
  }

  if (isMobileRedirect) {
    const session = exchangeData.session;
    if (!session?.access_token || !session?.refresh_token) {
      return redirectWithError("oauth_failed");
    }

    authDebugLog("callback", "mobile_handoff_creating", {
      user_id: user.id,
      redirect_target: redirectTarget.value,
    });

    const handoffCode = generateMobileOAuthCode();
    const handoffCodeHash = hashMobileOAuthCode(handoffCode);
    const handoffExpiresAt = getMobileOAuthHandoffExpiresAt();

    const serviceRoleClient = createServiceRoleClient();
    const { error: handoffInsertError } = await serviceRoleClient
      .from("mobile_oauth_handoffs")
      .insert({
        code_hash: handoffCodeHash,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: user.id,
        expires_at: handoffExpiresAt,
      });

    if (handoffInsertError) {
      authDebugLog("callback", "mobile_handoff_failed", {
        user_id: user.id,
        message: handoffInsertError.message,
        code: handoffInsertError.code,
      });
      return redirectWithError("oauth_failed");
    }

    authDebugLog("callback", "mobile_handoff_created", {
      user_id: user.id,
    });

    return NextResponse.redirect(
      buildOAuthSuccessRedirect(redirectTarget, origin, { code: handoffCode })
    );
  }

  if (createdProfileInThisCallback) {
    const signupUrl = new URL(`${origin}/signup`);
    signupUrl.searchParams.set("step", "location");
    signupUrl.searchParams.set("auth", "success");
    if (inviteCode) {
      signupUrl.searchParams.set("invite", inviteCode);
    }
    if (nestedRedirectTo) {
      signupUrl.searchParams.set("redirect_to", nestedRedirectTo);
    }
    authDebugLog("callback", "redirect_new_profile_to_signup_location", {
      user_id: user.id,
      redirect_url: signupUrl.toString(),
    });
    return NextResponse.redirect(signupUrl.toString());
  }

  if (profile && (!profile.country_code || profile.country === "Unknown")) {
    if (redirectTarget.value === "/profile" || redirectTarget.value.startsWith("/login")) {
      authDebugLog("callback", "redirect_incomplete_profile_to_signup_location", {
        user_id: user.id,
        redirect_target: redirectTarget.value,
      });
      return NextResponse.redirect(
        `${origin}/signup?message=${encodeURIComponent(
          "Please complete your registration. Fill in your location information."
        )}&step=location&auth=success`
      );
    }
  }

  if (redirectTarget.value.startsWith("/signup")) {
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("country, country_code, city")
      .eq("id", user.id)
      .single();

    if (
      !currentProfile ||
      !currentProfile.country_code ||
      currentProfile.country === "Unknown"
    ) {
      const locationUrl = new URL(`${origin}/signup`);
      locationUrl.searchParams.set("step", "location");
      locationUrl.searchParams.set("auth", "success");
      if (inviteCode) {
        locationUrl.searchParams.set("invite", inviteCode);
      }
      if (nestedRedirectTo) {
        locationUrl.searchParams.set("redirect_to", nestedRedirectTo);
      }
      authDebugLog("callback", "redirect_signup_flow_to_location_step", {
        user_id: user.id,
        redirect_url: locationUrl.toString(),
      });
      return NextResponse.redirect(locationUrl.toString());
    }

    if (nestedRedirectTo) {
      const finalNestedTarget = normalizeOAuthRedirectTarget(nestedRedirectTo);
      if (finalNestedTarget.type === "web") {
        authDebugLog("callback", "redirect_signup_flow_to_nested_target", {
          user_id: user.id,
          nested_target: finalNestedTarget.value,
        });
        return NextResponse.redirect(
          buildOAuthSuccessRedirect(finalNestedTarget, origin)
        );
      }
    }

    const profileUrl = new URL(`${origin}/signup`);
    profileUrl.searchParams.set("step", "profile");
    profileUrl.searchParams.set("auth", "success");
    if (inviteCode) {
      profileUrl.searchParams.set("invite", inviteCode);
    }
    authDebugLog("callback", "redirect_signup_flow_to_profile_step", {
      user_id: user.id,
      redirect_url: profileUrl.toString(),
    });
    return NextResponse.redirect(profileUrl.toString());
  }

  authDebugLog("callback", "redirect_success_to_target", {
    user_id: user.id,
    redirect_target: redirectTarget.value,
  });
  return NextResponse.redirect(buildOAuthSuccessRedirect(redirectTarget, origin));
}
