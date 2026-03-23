import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import { authDebugLog } from "@/lib/auth/debug";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token || null;
}

async function getUserFromBearerToken(accessToken: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return supabase.auth.getUser(accessToken);
}

export async function GET(request: Request) {
  const bearerToken = getBearerToken(request);
  const authSource = bearerToken ? "bearer" : "cookie";

  let authUser: Awaited<ReturnType<typeof getUserFromBearerToken>>["data"]["user"] =
    null;
  let authError: Error | null = null;

  if (bearerToken) {
    const { data, error } = await getUserFromBearerToken(bearerToken);
    authUser = data.user;
    authError = error;
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    authUser = data.user;
    authError = error;
  }

  authDebugLog("me", "auth_user_lookup", {
    auth_source: authSource,
    auth_user_id: authUser?.id ?? null,
    auth_error: authError?.message ?? null,
  });

  if (authError || !authUser) {
    authDebugLog("me", "response_unauthenticated", {
      auth_source: authSource,
      has_auth_error: Boolean(authError),
    });
    return NextResponse.json({ user: null, profile: null });
  }

  const serviceRoleClient = createServiceRoleClient();
  const { data: profile, error: profileError } = await serviceRoleClient
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  authDebugLog("me", "profile_lookup", {
    auth_user_id: authUser.id,
    profile_found: Boolean(profile),
    profile_error_code: profileError?.code ?? null,
    profile_error_message: profileError?.message ?? null,
  });

  if (profileError || !profile) {
    authDebugLog("me", "response_user_without_profile", {
      auth_user_id: authUser.id,
    });
    return NextResponse.json({ user: authUser, profile: null });
  }

  const { data: profileInterests } = await serviceRoleClient
    .from("profile_interests")
    .select("interest:interests(slug)")
    .eq("user_id", authUser.id);

  const interest_slugs = (profileInterests || [])
    .map((row: { interest: { slug: string } | { slug: string }[] | null }) =>
      Array.isArray(row.interest) ? row.interest[0]?.slug : row.interest?.slug
    )
    .filter((slug: string | undefined): slug is string => Boolean(slug));

  const profileRecord = profile as Record<string, unknown> & {
    id?: string;
    twitter_handle?: string | null;
  };

  const profileWithInterests = {
    ...profileRecord,
    interest_slugs,
  };

  authDebugLog("me", "response_user_with_profile", {
    auth_user_id: authUser.id,
    profile_id: profileRecord.id ?? null,
    twitter_handle: profileRecord.twitter_handle ?? null,
  });
  return NextResponse.json({ user: authUser, profile: profileWithInterests });
}
