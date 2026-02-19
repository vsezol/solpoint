import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
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

  if (authError || !authUser) {
    return NextResponse.json({ user: null, profile: null });
  }

  const serviceRoleClient = createServiceRoleClient();
  const { data: profile, error: profileError } = await serviceRoleClient
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ user: authUser, profile: null });
  }

  return NextResponse.json({ user: authUser, profile });
}
